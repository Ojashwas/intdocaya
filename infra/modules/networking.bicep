param location string
param name string
resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: name
  location: location
  properties: {
    addressSpace: { addressPrefixes: ['10.42.0.0/16'] }
    subnets: [
      { name: 'snet-containerapps', properties: { addressPrefix: '10.42.0.0/23', delegations: [{ name: 'containerapps', properties: { serviceName: 'Microsoft.App/environments' } }] } }
      { name: 'snet-private-endpoints', properties: { addressPrefix: '10.42.2.0/24', privateEndpointNetworkPolicies: 'Disabled' } }
      { name: 'snet-postgresql', properties: { addressPrefix: '10.42.3.0/24', delegations: [{ name: 'postgresql', properties: { serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers' } }] } }
    ]
  }
}
output virtualNetworkId string = vnet.id
output containerAppsSubnetId string = vnet.properties.subnets[0].id
output privateEndpointSubnetId string = vnet.properties.subnets[1].id
output postgresSubnetId string = vnet.properties.subnets[2].id

