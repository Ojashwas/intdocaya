import crypto from 'node:crypto'
import { HttpError } from './errors.mjs'

const buckets = new Map()
const RATE_LIMIT = 120

export function prepareRequest(req, res, config) {
  const suppliedRequestId = String(req.headers['x-request-id'] || '')
  const requestId = /^[A-Za-z0-9._-]{1,100}$/.test(suppliedRequestId)
    ? suppliedRequestId
    : `req_${crypto.randomUUID()}`
  req.requestId = requestId
  res.setHeader('x-request-id', requestId)
  res.setHeader('x-content-type-options', 'nosniff')
  res.setHeader('x-frame-options', 'DENY')
  res.setHeader('referrer-policy', 'no-referrer')
  res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()')
  if (config.environment === 'production')
    res.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains')
  res.setHeader(
    'content-security-policy',
    "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  )
  const origin = req.headers.origin
  if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader('access-control-allow-origin', origin)
    res.setHeader('vary', 'origin')
    res.setHeader(
      'access-control-allow-headers',
      'authorization, content-type, idempotency-key, x-request-id, content-range',
    )
    res.setHeader('access-control-allow-methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  } else if (origin) {
    throw new HttpError(403, 'ORIGIN_DENIED', 'The request origin is not allowed.')
  }
  const limit = config.rateLimit || RATE_LIMIT
  const minute = Math.floor(Date.now() / 60_000)
  const key = `${req.socket.remoteAddress || 'unknown'}:${minute}`
  const count = (buckets.get(key) || 0) + 1
  buckets.set(key, count)
  res.setHeader('ratelimit-limit', String(limit))
  res.setHeader('ratelimit-remaining', String(Math.max(0, limit - count)))
  res.setHeader('ratelimit-reset', String((minute + 1) * 60))
  if (count > limit) {
    res.setHeader('retry-after', '60')
    throw new HttpError(429, 'RATE_LIMITED', 'Too many requests. Try again shortly.')
  }
  for (const bucketKey of buckets.keys()) {
    if (!bucketKey.endsWith(`:${minute}`)) buckets.delete(bucketKey)
  }
}

export function sendJson(res, status, payload) {
  const body = status === 204 ? '' : JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

export async function readJson(req, limit) {
  const declared = Number(req.headers['content-length'] || 0)
  if (declared > limit)
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'The request body exceeds the allowed size.')
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit)
      throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'The request body exceeds the allowed size.')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'The request body is not valid JSON.')
  }
}

export function sendError(res, error, requestId) {
  const known = error instanceof HttpError
  const status = known ? error.status : 500
  const code = known ? error.code : 'INTERNAL_ERROR'
  const message = known ? error.message : 'The request could not be completed.'
  if (!known)
    console.error(JSON.stringify({ level: 'error', requestId, message: error?.message, stack: error?.stack }))
  sendJson(res, status, {
    error: { code, message, requestId, docs: `https://developers.docaya.io/errors/${code}` },
  })
}
