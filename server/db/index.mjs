import { SqliteRepository } from './sqlite.mjs'

export async function createRepository(config) {
  if (config.localSqlite)
    return new SqliteRepository(config.sqlitePath, { seed: config.environment === 'development' })
  const { PostgresRepository } = await import('./postgres.mjs')
  return PostgresRepository.connect(config.postgresUrl)
}
