param location string
param name string
param privateEndpointSubnetId string
param virtualNetworkId string
param production bool
resource cache 'Microsoft.Cache/Redis@2024-11-01' = { name: name, location: location, properties: { sku: { name: production ? 'Premium' : 'Standard', family: production ? 'P' : 'C', capacity: production ? 1 : 1 }, minimumTlsVersion: '1.2', publicNetworkAccess: 'Disabled', redisConfiguration: { 'maxmemory-policy': 'allkeys-lru' }, enableNonSslPort: false } }
resource dns 'Microsoft.Network/privateDnsZones@2020-06-01' = { name: 'privatelink.redis.cache.windows.net', location: 'global' }
resource link 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = { parent: dns, name: 'docaya-link', location: 'global', properties: { virtualNetwork: { id: virtualNetworkId }, registrationEnabled: false } }
resource endpoint 'Microsoft.Network/privateEndpoints@2024-05-01' = { name: '${name}-pe', location: location, properties: { subnet: { id: privateEndpointSubnetId }, privateLinkServiceConnections: [{ name: 'redis', properties: { privateLinkServiceId: cache.id, groupIds: ['redisCache'] } }] } }
resource zoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = { parent: endpoint, name: 'default', properties: { privateDnsZoneConfigs: [{ name: 'redis', properties: { privateDnsZoneId: dns.id } }] } }
output id string = cache.id
output hostName string = cache.properties.hostName

