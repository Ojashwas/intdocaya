param location string
param serverName string
param delegatedSubnetResourceId string
param virtualNetworkId string
@secure()
param administratorPassword string
param production bool
resource dns 'Microsoft.Network/privateDnsZones@2020-06-01' = { name: 'private.postgres.database.azure.com', location: 'global' }
resource dnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = { parent: dns, name: 'docaya-link', location: 'global', properties: { virtualNetwork: { id: virtualNetworkId }, registrationEnabled: false } }
resource server 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: serverName
  location: location
  sku: { name: production ? 'Standard_D4ds_v5' : 'Standard_B1ms', tier: production ? 'GeneralPurpose' : 'Burstable' }
  properties: {
    version: '16', administratorLogin: 'docayaadmin', administratorLoginPassword: administratorPassword
    storage: { storageSizeGB: production ? 128 : 32, autoGrow: 'Enabled' }
    backup: { backupRetentionDays: production ? 35 : 7, geoRedundantBackup: production ? 'Enabled' : 'Disabled' }
    highAvailability: { mode: production ? 'ZoneRedundant' : 'Disabled' }
    network: { delegatedSubnetResourceId: delegatedSubnetResourceId, privateDnsZoneArmResourceId: dns.id }
  }
  dependsOn: [dnsLink]
}
resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = { parent: server, name: 'docaya', properties: { charset: 'UTF8', collation: 'en_US.utf8' } }
output serverId string = server.id
output fqdn string = server.properties.fullyQualifiedDomainName

