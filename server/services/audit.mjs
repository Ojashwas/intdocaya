import crypto from 'node:crypto'

export async function audit(
  repository,
  req,
  actor,
  action,
  objectType,
  objectId,
  outcome = 'success',
  detail = {},
) {
  const createdAt = new Date().toISOString()
  const base = {
    id: `audit-${crypto.randomUUID()}`,
    tenantId: actor.tenantId,
    actorId: actor.id,
    actorName: actor.name,
    action,
    objectType,
    objectId,
    outcome,
    requestId: req.requestId,
    sourceIp: req.socket.remoteAddress,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
    detail,
    createdAt,
  }
  await repository.appendAudit({
    ...base,
    hash: (previous) =>
      crypto
        .createHash('sha256')
        .update(JSON.stringify({ ...base, previous }))
        .digest('hex'),
  })
}
