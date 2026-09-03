param location string
param prefix string
param suffix string
param production bool
resource log 'Microsoft.OperationalInsights/workspaces@2023-09-01' = { name: '${prefix}-law-${suffix}', location: location, properties: { sku: { name: 'PerGB2018' }, retentionInDays: production ? 90 : 30 } }
resource insights 'Microsoft.Insights/components@2020-02-02' = { name: '${prefix}-appi-${suffix}', location: location, kind: 'web', properties: { Application_Type: 'web', WorkspaceResourceId: log.id } }
resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = { name: '${prefix}-operations', location: 'global', properties: { groupShortName: 'DocayaOps', enabled: true } }
resource availabilityAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = { name: '${prefix}-availability', location: 'global', properties: { description: 'Docaya server dependency availability', severity: 1, enabled: true, scopes: [insights.id], evaluationFrequency: 'PT5M', windowSize: 'PT15M', criteria: { 'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria', allOf: [{ name: 'failedRequests', metricName: 'requests/failed', operator: 'GreaterThan', threshold: 5, timeAggregation: 'Total', criterionType: 'StaticThresholdCriterion' }] }, actions: [{ actionGroupId: actionGroup.id }] } }
output logAnalyticsCustomerId string = log.properties.customerId
@secure()
output logAnalyticsSharedKey string = log.listKeys().primarySharedKey
output applicationInsightsConnectionString string = insights.properties.ConnectionString

