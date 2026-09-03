import { describe, expect, it } from 'vitest'
import { loadConfig } from '../../server/config/env.mjs'

const development = {
  environment: 'test',
  authMode: 'development',
  devTokenSecret: 'a-development-secret-with-32-characters',
  localSqlite: true,
  corsOrigins: ['http://localhost:5173'],
  port: 8787,
}

describe('environment configuration', () => {
  it('loads an isolated local development configuration', () => {
    const config = loadConfig(development)
    expect(config.localSqlite).toBe(true)
    expect(config.authMode).toBe('development')
  })
  it('rejects development auth in production', () =>
    expect(() => loadConfig({ ...development, environment: 'production' })).toThrow(/prohibited/))
  it('rejects wildcard CORS', () =>
    expect(() => loadConfig({ ...development, corsOrigins: ['*'] })).toThrow(/Wildcard/))
  it('rejects a short development secret', () =>
    expect(() => loadConfig({ ...development, devTokenSecret: 'short' })).toThrow(/32/))
  it('rejects production without PostgreSQL', () =>
    expect(() =>
      loadConfig({
        ...development,
        environment: 'production',
        authMode: 'entra',
        entraTenantId: 'tenant',
        entraClientId: 'client',
        localSqlite: false,
        postgresUrl: '',
      }),
    ).toThrow(/PostgreSQL/))
  it('accepts a production Entra and PostgreSQL configuration', () => {
    const config = loadConfig({
      ...development,
      environment: 'production',
      authMode: 'entra',
      entraTenantId: 'tenant',
      entraClientId: 'client',
      localSqlite: false,
      postgresUrl: 'postgres://example',
      corsOrigins: ['https://docaya.example'],
    })
    expect(config.postgresUrl).toBe('postgres://example')
  })
  it('requires explicit SharePoint identifiers for managed identity', () =>
    expect(() => loadConfig({ ...development, managedIdentity: true })).toThrow(/drive ID/))
})
