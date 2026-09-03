import { describe, expect, it } from 'vitest'
import { authorize, createAuthenticator, issueDevelopmentToken } from '../../server/middleware/auth.mjs'

const config = { authMode: 'development', devTokenSecret: 'a-development-secret-with-32-characters' }
describe('authentication and authorization', () => {
  it('verifies a development token and maps actor claims', async () => {
    const token = await issueDevelopmentToken(config, { sub: 'user-7', roles: ['viewer'], tid: 'tenant-2' })
    const actor = await createAuthenticator(config)({ headers: { authorization: `Bearer ${token}` } })
    expect(actor).toMatchObject({ id: 'user-7', tenantId: 'tenant-2', roles: ['viewer'] })
  })
  it('rejects a missing bearer token', async () =>
    await expect(createAuthenticator(config)({ headers: {} })).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
    }))
  it('rejects a tampered token', async () =>
    await expect(
      createAuthenticator(config)({ headers: { authorization: 'Bearer invalid' } }),
    ).rejects.toMatchObject({ status: 401, code: 'INVALID_TOKEN' }))
  it('allows a viewer to read documents', () =>
    expect(() => authorize({ roles: ['viewer'], tenantId: 't' }, 'document:read')).not.toThrow())
  it('denies a viewer document writes', () =>
    expect(() => authorize({ roles: ['viewer'], tenantId: 't' }, 'document:write')).toThrow(/do not have/))
  it('denies cross-tenant access', () =>
    expect(() =>
      authorize({ roles: ['super-admin'], tenantId: 't1' }, 'document:read', { tenantId: 't2' }),
    ).toThrow(/Cross-tenant/))
})
