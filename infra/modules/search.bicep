param location string
param name string
param privateEndpointSubnetId string
param virtualNetworkId string
param production bool
resource service 'Microsoft.Search/searchServices@2024-03-01-preview' = { name: name, location: location, sku: { name: production ? 'standard' : 'basic' }, properties: { replicaCount: production ? 3 : 1, partitionCount: production ? 2 : 1, publicNetworkAccess: 'disabled', disableLocalAuth: true, hostingMode: 'default' } }
resource dns 'Microsoft.Network/privateDnsZones@2020-06-01' = { name: 'privatelink.search.windows.net', location: 'global' }
resource link 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = { parent: dns, name: 'docaya-link', location: 'global', properties: { virtualNetwork: { id: virtualNetworkId }, registrationEnabled: false } }
resource endpoint 'Microsoft.Network/privateEndpoints@2024-05-01' = { name: '${name}-pe', location: location, properties: { subnet: { id: privateEndpointSubnetId }, privateLinkServiceConnections: [{ name: 'search', properties: { privateLinkServiceId: service.id, groupIds: ['searchService'] } }] } }
resource zoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = { parent: endpoint, name: 'default', properties: { privateDnsZoneConfigs: [{ name: 'search', properties: { privateDnsZoneId: dns.id } }] } }
output id string = service.id
output endpoint string = 'https://${service.name}.search.windows.net'

