import { loadConfig } from '../config/env.mjs'
import { initializeTelemetry } from '../observability/init.mjs'

const config = loadConfig()
await initializeTelemetry()
const { createRepository } = await import('../db/index.mjs')
const { createDocayaServer } = await import('./create-server.mjs')
const { AzureSearchAdapter } = await import('../services/azure-search.mjs')
const { RedisCacheAdapter } = await import('../services/redis-cache.mjs')
const { ServiceBusRestPublisher } = await import('../services/service-bus.mjs')
const { AzureOpenAiAdapter } = await import('../services/azure-openai.mjs')
const repository = await createRepository(config)
const search = config.searchEndpoint || config.searchIndex || config.searchApiKey
  ? new AzureSearchAdapter(config)
  : null
const cache = config.redisUrl ? new RedisCacheAdapter(config.redisUrl, config.redisToken) : null
const events = config.serviceBusNamespace || config.serviceBusTopic
  ? new ServiceBusRestPublisher(config)
  : null
const assistant =
  config.openaiEndpoint && config.openaiDeployment && config.openaiApiKey
    ? new AzureOpenAiAdapter(config)
    : null
const server = createDocayaServer({ config, repository, search, cache, events, assistant })

server.listen(config.port, () => {
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'server.started',
      port: config.port,
      environment: config.environment,
    }),
  )
})

const shutdown = async (signal) => {
  console.log(JSON.stringify({ level: 'info', event: 'server.stopping', signal }))
  server.close(async () => {
    await repository.close?.()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
