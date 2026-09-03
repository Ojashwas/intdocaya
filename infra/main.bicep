targetScope = 'resourceGroup'

@description('Azure region for this isolated environment.')
param location string = resourceGroup().location
@allowed(['development','test','production'])
param environmentName string
@description('Immutable ACR image tag or digest. The value latest is prohibited by release policy.')
@minLength(10)
param containerImage string
@secure()
param postgresAdministratorPassword string
@secure()
param postgresConnectionString string
param entraTenantId string
param entraClientId string
param corsAllowedOrigins string
param sharePointSiteUrl string
param sharePointDriveId string
param nameSuffix string = uniqueString(resourceGroup().id, environmentName)

var prefix = 'docaya-${environmentName}'
var production = environmentName == 'production'

module networking './modules/networking.bicep' = { name: 'networking', params: { location: location, name: '${prefix}-vnet-${nameSuffix}' } }
module observability './modules/observability.bicep' = { name: 'observability', params: { location: location, prefix: prefix, suffix: nameSuffix, production: production } }
module postgresql './modules/postgresql.bicep' = { name: 'postgresql', params: { location: location, serverName: '${prefix}-pg-${nameSuffix}', delegatedSubnetResourceId: networking.outputs.postgresSubnetId, virtualNetworkId: networking.outputs.virtualNetworkId, administratorPassword: postgresAdministratorPassword, production: production } }
module search './modules/search.bicep' = { name: 'search', params: { location: location, name: '${prefix}-search-${nameSuffix}', privateEndpointSubnetId: networking.outputs.privateEndpointSubnetId, virtualNetworkId: networking.outputs.virtualNetworkId, production: production } }
module redis './modules/redis.bicep' = { name: 'redis', params: { location: location, name: '${prefix}-redis-${nameSuffix}', privateEndpointSubnetId: networking.outputs.privateEndpointSubnetId, virtualNetworkId: networking.outputs.virtualNetworkId, production: production } }
module serviceBus './modules/service-bus.bicep' = { name: 'service-bus', params: { location: location, name: '${prefix}-sb-${nameSuffix}', privateEndpointSubnetId: networking.outputs.privateEndpointSubnetId, virtualNetworkId: networking.outputs.virtualNetworkId, production: production } }
module application './modules/container-app.bicep' = {
  name: 'application'
  params: {
    location: location, prefix: prefix, suffix: nameSuffix, containerImage: containerImage
    infrastructureSubnetId: networking.outputs.containerAppsSubnetId, privateEndpointSubnetId: networking.outputs.privateEndpointSubnetId, virtualNetworkId: networking.outputs.virtualNetworkId
    logAnalyticsCustomerId: observability.outputs.logAnalyticsCustomerId, logAnalyticsSharedKey: observability.outputs.logAnalyticsSharedKey, applicationInsightsConnectionString: observability.outputs.applicationInsightsConnectionString
    postgresConnectionString: postgresConnectionString, postgresHost: postgresql.outputs.fqdn, searchEndpoint: search.outputs.endpoint, redisHost: redis.outputs.hostName, serviceBusNamespace: serviceBus.outputs.endpoint
    entraTenantId: entraTenantId, entraClientId: entraClientId, corsAllowedOrigins: corsAllowedOrigins, sharePointSiteUrl: sharePointSiteUrl, sharePointDriveId: sharePointDriveId, production: production
  }
}

output containerAppName string = application.outputs.containerAppName
output containerAppFqdn string = application.outputs.containerAppFqdn
output validationNotice string = 'Compilation is not deployment validation. Review target-scope validate, policy, RBAC, and what-if before promotion.'

