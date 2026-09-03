param location string
param name string
param privateEndpointSubnetId string
param virtualNetworkId string
param production bool
resource namespace 'Microsoft.ServiceBus/namespaces@2024-01-01' = { name: name, location: location, sku: { name: production ? 'Premium' : 'Standard', tier: production ? 'Premium' : 'Standard', capacity: production ? 1 : 0 }, properties: { publicNetworkAccess: 'Disabled', minimumTlsVersion: '1.2', zoneRedundant: production, disableLocalAuth: true } }
resource queue 'Microsoft.ServiceBus/namespaces/queues@2024-01-01' = { parent: namespace, name: 'domain-events', properties: { lockDuration: 'PT1M', maxDeliveryCount: 10, deadLetteringOnMessageExpiration: true } }
resource dns 'Microsoft.Network/privateDnsZones@2020-06-01' = { name: 'privatelink.servicebus.windows.net', location: 'global' }
resource link 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = { parent: dns, name: 'docaya-link', location: 'global', properties: { virtualNetwork: { id: virtualNetworkId }, registrationEnabled: false } }
resource endpoint 'Microsoft.Network/privateEndpoints@2024-05-01' = { name: '${name}-pe', location: location, properties: { subnet: { id: privateEndpointSubnetId }, privateLinkServiceConnections: [{ name: 'servicebus', properties: { privateLinkServiceId: namespace.id, groupIds: ['namespace'] } }] } }
resource zoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = { parent: endpoint, name: 'default', properties: { privateDnsZoneConfigs: [{ name: 'servicebus', properties: { privateDnsZoneId: dns.id } }] } }
output id string = namespace.id
output endpoint string = '${namespace.name}.servicebus.windows.net'

