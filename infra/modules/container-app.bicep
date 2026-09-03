param location string
param prefix string
param suffix string
param containerImage string
param infrastructureSubnetId string
param privateEndpointSubnetId string
param virtualNetworkId string
param logAnalyticsCustomerId string
@secure()
param logAnalyticsSharedKey string
param applicationInsightsConnectionString string
@secure()
param postgresConnectionString string
param postgresHost string
param searchEndpoint string
param redisHost string
param serviceBusNamespace string
param entraTenantId string
param entraClientId string
param corsAllowedOrigins string
param sharePointSiteUrl string
param sharePointDriveId string
param production bool

var registryName = replace('${prefix}acr${suffix}', '-', '')
resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = { name: registryName, location: location, sku: { name: production ? 'Premium' : 'Basic' }, properties: { adminUserEnabled: false, publicNetworkAccess: production ? 'Disabled' : 'Enabled', zoneRedundancy: production ? 'Enabled' : 'Disabled' } }
resource registryDns 'Microsoft.Network/privateDnsZones@2020-06-01' = if (production) { name: 'privatelink.azurecr.io', location: 'global' }
resource registryLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = if (production) { parent: registryDns, name: 'docaya-link', location: 'global', properties: { virtualNetwork: { id: virtualNetworkId }, registrationEnabled: false } }
resource registryEndpoint 'Microsoft.Network/privateEndpoints@2024-05-01' = if (production) { name: '${registry.name}-pe', location: location, properties: { subnet: { id: privateEndpointSubnetId }, privateLinkServiceConnections: [{ name: 'registry', properties: { privateLinkServiceId: registry.id, groupIds: ['registry'] } }] } }
resource registryZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = if (production) { parent: registryEndpoint, name: 'default', properties: { privateDnsZoneConfigs: [{ name: 'registry', properties: { privateDnsZoneId: registryDns.id } }] } }
resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = { name: '${prefix}-cae-${suffix}', location: location, properties: { vnetConfiguration: { infrastructureSubnetId: infrastructureSubnetId, internal: true }, appLogsConfiguration: { destination: 'log-analytics', logAnalyticsConfiguration: { customerId: logAnalyticsCustomerId, sharedKey: logAnalyticsSharedKey } }, zoneRedundant: production } }
resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${prefix}-api-${suffix}'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Multiple'
      ingress: { external: false, targetPort: 8787, transport: 'http', allowInsecure: false, traffic: [{ latestRevision: true, weight: 100 }] }
      registries: [{ server: registry.properties.loginServer, identity: 'system' }]
      secrets: [{ name: 'postgres-url', value: postgresConnectionString }]
    }
    template: {
      containers: [{
        name: 'docaya', image: containerImage
        env: [
          { name: 'DOCAYA_ENV', value: production ? 'production' : 'development' }, { name: 'PORT', value: '8787' }, { name: 'AUTH_MODE', value: 'entra' }, { name: 'LOCAL_SQLITE_ENABLED', value: 'false' }
          { name: 'POSTGRES_URL', secretRef: 'postgres-url' }, { name: 'POSTGRES_HOST', value: postgresHost }, { name: 'ENTRA_TENANT_ID', value: entraTenantId }, { name: 'ENTRA_CLIENT_ID', value: entraClientId }
          { name: 'CORS_ALLOWED_ORIGINS', value: corsAllowedOrigins }, { name: 'SHAREPOINT_SITE_URL', value: sharePointSiteUrl }, { name: 'SHAREPOINT_DRIVE_ID', value: sharePointDriveId }, { name: 'SHAREPOINT_USE_MANAGED_IDENTITY', value: 'true' }
          { name: 'AZURE_SEARCH_ENDPOINT', value: searchEndpoint }, { name: 'REDIS_HOST', value: redisHost }, { name: 'SERVICEBUS_NAMESPACE', value: serviceBusNamespace }, { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: applicationInsightsConnectionString }
        ]
        probes: [{ type: 'Liveness', httpGet: { path: '/health/live', port: 8787 }, initialDelaySeconds: 15, periodSeconds: 30 }, { type: 'Readiness', httpGet: { path: '/health/ready', port: 8787 }, initialDelaySeconds: 5, periodSeconds: 10 }]
        resources: { cpu: json(production ? '1.0' : '0.5'), memory: production ? '2Gi' : '1Gi' }
      }]
      scale: { minReplicas: production ? 2 : 1, maxReplicas: production ? 20 : 3, rules: [{ name: 'http', http: { metadata: { concurrentRequests: '50' } } }] }
    }
  }
}
resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = { scope: registry, name: guid(registry.id,app.id,'AcrPull'), properties: { principalId: app.identity.principalId, principalType: 'ServicePrincipal', roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions','7f951dda-4ed3-4680-a7ca-43fe172d538d') } }
output containerAppName string = app.name
output containerAppFqdn string = app.properties.configuration.ingress.fqdn
output principalId string = app.identity.principalId

