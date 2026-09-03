export async function initializeTelemetry() {
  if (!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) return
  const { useAzureMonitor } = await import('@azure/monitor-opentelemetry')
  useAzureMonitor({
    azureMonitorExporterOptions: { connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING },
    enableLiveMetrics: true,
    instrumentationOptions: { http: { enabled: true }, azureSdk: { enabled: true } },
  })
}
