import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose'
import { HttpError } from './errors.mjs'

const capabilities = {
  'super-admin': ['*'],
  'org-admin': [
    'document:read',
    'document:write',
    'document:delete',
    'workflow:read',
    'workflow:approve',
    'notification:read',
    'audit:read',
    'admin:read',
    'admin:write',
  ],
  'workspace-admin': [
    'document:read',
    'document:write',
    'document:delete',
    'workflow:read',
    'workflow:approve',
    'notification:read',
  ],
  'content-manager': [
    'document:read',
    'document:write',
    'document:delete',
    'workflow:read',
    'workflow:approve',
    'notification:read',
  ],
  contributor: ['document:read', 'document:write', 'workflow:read', 'notification:read'],
  viewer: ['document:read', 'workflow:read', 'notification:read'],
  guest: ['document:read'],
  auditor: ['document:read', 'audit:read'],
}

const encoder = new TextEncoder()

export function createAuthenticator(config) {
  const developmentKey = encoder.encode(config.devTokenSecret)
  const jwks =
    config.authMode === 'entra'
      ? createRemoteJWKSet(
          new URL(`https://login.microsoftonline.com/${config.entraTenantId}/discovery/v2.0/keys`),
        )
      : null

  return async function authenticate(req) {
    const header = req.headers.authorization || ''
    if (!header.startsWith('Bearer '))
      throw new HttpError(401, 'UNAUTHENTICATED', 'A valid bearer token is required.')
    const token = header.slice(7)
    let payload
    try {
      if (config.authMode === 'entra') {
        const verified = await jwtVerify(token, jwks, {
          audience: config.entraClientId,
          issuer: [
            `https://login.microsoftonline.com/${config.entraTenantId}/v2.0`,
            `https://sts.windows.net/${config.entraTenantId}/`,
          ],
        })
        payload = verified.payload
      } else {
        payload = (
          await jwtVerify(token, developmentKey, { issuer: 'docaya-development', audience: 'docaya-api' })
        ).payload
      }
    } catch {
      throw new HttpError(401, 'INVALID_TOKEN', 'The bearer token is invalid or expired.')
    }
    const actor = {
      id: String(payload.oid || payload.sub || ''),
      tenantId: String(payload.tid || 'local-tenant'),
      name: String(payload.name || payload.preferred_username || 'Docaya user'),
      email: String(payload.preferred_username || payload.email || ''),
      roles: Array.isArray(payload.roles) ? payload.roles.map(String) : ['viewer'],
    }
    if (!actor.id) throw new HttpError(401, 'INVALID_TOKEN', 'The token does not identify an actor.')
    return actor
  }
}

export function authorize(actor, capability, resource = {}) {
  const permitted = actor.roles.some(
    (role) => capabilities[role]?.includes('*') || capabilities[role]?.includes(capability),
  )
  if (!permitted) throw new HttpError(403, 'PERMISSION_DENIED', `You do not have ${capability} access.`)
  if (resource.tenantId && resource.tenantId !== actor.tenantId)
    throw new HttpError(403, 'TENANT_BOUNDARY', 'Cross-tenant access is denied.')
}

export async function issueDevelopmentToken(config, claims = {}) {
  if (config.authMode !== 'development') throw new HttpError(404, 'NOT_FOUND', 'Route not found.')
  return new SignJWT({
    name: 'Khalid Al Mansoori',
    preferred_username: 'k.mansoori@moi.gov.ae',
    tid: 'local-tenant',
    roles: ['org-admin'],
    ...claims,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(claims.sub || 'local-user'))
    .setIssuer('docaya-development')
    .setAudience('docaya-api')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(encoder.encode(config.devTokenSecret))
}
