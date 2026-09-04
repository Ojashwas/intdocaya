import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createDocayaServer } from '../../server/app/create-server.mjs'
import { SqliteRepository } from '../../server/db/sqlite.mjs'
import { issueDevelopmentToken } from '../../server/middleware/auth.mjs'

const root = mkdtempSync(join(tmpdir(), 'docaya-test-'))
const config = {
  environment: 'test',
  authMode: 'development',
  devTokenSecret: 'a-development-secret-with-32-characters',
  corsOrigins: ['http://localhost:5173'],
  bodyLimit: 1_048_576,
  uploadMaxBytes: 1_048_576,
  uploadExtensions: ['txt'],
  uploadMimeTypes: ['text/plain'],
  localSqlite: true,
  sqlitePath: join(root, 'test.sqlite'),
  uploadPath: join(root, 'uploads'),
}
const repository = new SqliteRepository(config.sqlitePath, { seed: true })
const server = createDocayaServer({ config, repository })
let base = ''
let admin = ''
let viewer = ''

beforeAll(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  base = `http://127.0.0.1:${address.port}`
  admin = await issueDevelopmentToken(config)
  viewer = await issueDevelopmentToken(config, { sub: 'viewer', roles: ['viewer'] })
})
afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
  repository.close()
  const resolved = resolve(root)
  if (resolved.startsWith(resolve(tmpdir()))) rmSync(resolved, { recursive: true, force: true })
})
const call = (path, token = admin, init = {}) =>
  fetch(`${base}${path}`, {
    ...init,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
  })

describe('v1 API contract', () => {
  it('exposes minimal unauthenticated health', async () => {
    const response = await call('/health/live', '')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(expect.objectContaining({ status: 'ok' }))
  })
  it('reports readiness with a working database health check', async () => {
    const response = await call('/health/ready', '')
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.status).toBe('ready')
    expect(payload.checks.database).toMatchObject({ status: 'ok' })
  })
  it('rejects unauthenticated business access with request id', async () => {
    const response = await call('/api/v1/documents', '')
    expect(response.status).toBe(401)
    expect((await response.json()).error).toMatchObject({
      code: 'UNAUTHENTICATED',
      requestId: expect.any(String),
    })
  })
  it('provides deterministic cursor pagination', async () => {
    const first = await call('/api/v1/documents?limit=2')
    const payload = await first.json()
    expect(payload.documents).toHaveLength(2)
    expect(payload.page.nextCursor).toEqual(expect.any(String))
    const second = await call(`/api/v1/documents?limit=2&cursor=${payload.page.nextCursor}`)
    expect((await second.json()).documents).toHaveLength(2)
  })
  it('enforces role capabilities', async () => {
    const response = await call('/api/v1/documents', viewer, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'viewer-write' },
      body: '{}',
    })
    expect(response.status).toBe(403)
  })
  it('validates document registration', async () => {
    const response = await call('/api/v1/documents', admin, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'bad-document' },
      body: '{}',
    })
    expect(response.status).toBe(422)
  })
  it('returns 404 for a missing update and 405 for unsupported methods', async () => {
    const missing = await call('/api/v1/documents/missing', admin, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Valid title' }),
    })
    expect(missing.status).toBe(404)
    const method = await call('/api/v1/audit', admin, { method: 'POST' })
    expect(method.status).toBe(405)
    expect(method.headers.get('allow')).toBeTruthy()
  })
  it('runs resumable upload, hash, scan, and commit', async () => {
    const bytes = new TextEncoder().encode('safe test file')
    const sessionResponse = await call('/api/v1/uploads', admin, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'upload-one' },
      body: JSON.stringify({
        fileName: 'record.txt',
        mimeType: 'text/plain',
        sizeBytes: bytes.length,
        metadata: {
          type: 'Record',
          department: 'Legal',
          library: 'Governance',
          summary: 'Safe test',
          retention: '2 years',
          nextReview: '2027-09-03',
          reviewer: 'Reviewer',
          approver: 'Approver',
        },
      }),
    })
    expect(sessionResponse.status).toBe(201)
    const session = await sessionResponse.json()
    expect(
      (
        await call(`/api/v1/uploads/${session.upload.id}/chunks/0`, admin, {
          method: 'PUT',
          headers: { 'content-type': 'application/octet-stream', 'content-length': String(bytes.length) },
          body: bytes,
        })
      ).status,
    ).toBe(200)
    const completed = await call(`/api/v1/uploads/${session.upload.id}/complete`, admin, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ metadata: { title: 'Safe Record' } }),
    })
    expect(completed.status).toBe(201)
    expect((await completed.json()).document.contentHash).toMatch(/^[a-f0-9]{64}$/)
  })
  it('blocks a disallowed origin', async () => {
    const response = await call('/api/v1/documents', admin, { headers: { origin: 'https://evil.example' } })
    expect(response.status).toBe(403)
  })
  it('lists admin users with lifecycle timestamps', async () => {
    const response = await call('/api/v1/admin/users')
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.users.length).toBeGreaterThan(0)
    expect(payload.users[0]).toMatchObject({ id: expect.any(String), created_at: expect.any(String) })
  })
  it('rejects admin user management for non-admin roles', async () => {
    const response = await call('/api/v1/admin/users', viewer, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Nope', email: 'nope@docaya.local', role: 'viewer' }),
    })
    expect(response.status).toBe(403)
  })
  it('validates new admin user input', async () => {
    const response = await call('/api/v1/admin/users', admin, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'A', email: 'not-an-email', role: 'super-admin' }),
    })
    expect(response.status).toBe(422)
  })
  it('creates, lists and updates an admin user end to end', async () => {
    const created = await call('/api/v1/admin/users', admin, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Test Invitee', email: 'invitee@docaya.local', role: 'viewer' }),
    })
    expect(created.status).toBe(201)
    const { user } = await created.json()
    expect(user).toMatchObject({ name: 'Test Invitee', role: 'viewer', status: 'invited' })

    const duplicate = await call('/api/v1/admin/users', admin, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Test Invitee', email: 'invitee@docaya.local', role: 'viewer' }),
    })
    expect(duplicate.status).toBe(409)

    const updated = await call(`/api/v1/admin/users/${user.id}`, admin, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'content-manager', status: 'active' }),
    })
    expect(updated.status).toBe(200)
    const updatedBody = await updated.json()
    expect(updatedBody.user).toMatchObject({ role: 'content-manager', status: 'active' })
    expect(updatedBody.user.updated_at).toEqual(expect.any(String))

    const missing = await call('/api/v1/admin/users/missing-user', admin, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'viewer' }),
    })
    expect(missing.status).toBe(404)
  })
  it('prevents an admin from suspending or deprovisioning their own account', async () => {
    const me = await (await call('/api/v1/auth/me')).json()
    const response = await call(`/api/v1/admin/users/${me.user.id}`, admin, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'suspended' }),
    })
    expect(response.status).toBe(409)
  })
})
