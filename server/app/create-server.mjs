import crypto from 'node:crypto'
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'
import { createAuthenticator, authorize, issueDevelopmentToken } from '../middleware/auth.mjs'
import { assert, HttpError } from '../middleware/errors.mjs'
import { prepareRequest, readJson, sendError, sendJson } from '../middleware/http.mjs'
import { audit } from '../services/audit.mjs'
import { UploadService } from '../services/uploads.mjs'

const documentStatuses = ['Draft', 'Under Review', 'Under Approval', 'Published', 'Superseded', 'Archived']
const classifications = ['Public', 'Internal', 'Confidential', 'Restricted']
const workflowDecisions = ['Approved', 'Changes requested', 'Rejected']
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}
const uuid = (prefix) => `${prefix}-${crypto.randomUUID()}`
const cleanText = (value, name, { min = 1, max = 240 } = {}) => {
  const text = String(value ?? '').trim()
  assert(
    text.length >= min && text.length <= max,
    422,
    'VALIDATION_ERROR',
    `${name} must contain ${min}-${max} characters.`,
  )
  return text
}
const parseCursor = (value) => {
  if (!value) return null
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    assert(
      decoded.id && (decoded.updatedAt || decoded.createdAt),
      400,
      'INVALID_CURSOR',
      'The cursor is invalid.',
    )
    return decoded
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(400, 'INVALID_CURSOR', 'The cursor is invalid.')
  }
}

export function createDocayaServer({ config, repository, search = null, cache = null, events = null }) {
  const authenticate = createAuthenticator(config)
  const uploads = new UploadService(config, repository)
  const staticRoot = resolve('dist')

  const handler = async (req, res) => {
    try {
      prepareRequest(req, res, config)
      if (req.method === 'OPTIONS') return sendJson(res, 204, {})
      const url = new URL(req.url, 'http://docaya.local')
      const route = url.pathname
      if (req.method === 'GET' && route === '/health/live')
        return sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() })
      if (req.method === 'GET' && route === '/health/ready')
        return sendJson(res, 200, { status: 'ready', timestamp: new Date().toISOString() })
      if (req.method === 'POST' && route === '/api/v1/auth/development-token')
        return sendJson(res, 200, {
          accessToken: await issueDevelopmentToken(config),
          tokenType: 'Bearer',
          expiresIn: 3600,
        })

      if (route.startsWith('/api/')) {
        if (!route.startsWith('/api/v1/'))
          throw new HttpError(404, 'API_VERSION_REQUIRED', 'Use the /api/v1 API contract.')
        const actor = await authenticate(req)
        req.actor = actor

        if (route === '/api/v1/auth/me' && req.method === 'GET') {
          await audit(repository, req, actor, 'identity.read', 'user', actor.id)
          return sendJson(res, 200, { user: actor })
        }

        if (route === '/api/v1/documents' && req.method === 'GET') {
          authorize(actor, 'document:read')
          const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 25), 1), 100)
          const result = await repository.listDocuments(actor, {
            q: url.searchParams.get('q') || '',
            status: url.searchParams.get('status') || undefined,
            cursor: parseCursor(url.searchParams.get('cursor')),
            limit,
          })
          await audit(repository, req, actor, 'document.list', 'document', null, 'success', {
            count: result.items.length,
          })
          return sendJson(res, 200, {
            documents: result.items,
            page: { nextCursor: result.nextCursor, limit },
          })
        }
        if (route === '/api/v1/documents' && req.method === 'POST') {
          authorize(actor, 'document:write')
          assert(
            req.headers['idempotency-key'],
            400,
            'IDEMPOTENCY_KEY_REQUIRED',
            'An Idempotency-Key header is required.',
          )
          const body = await readJson(req, config.bodyLimit)
          const input = {
            id: uuid('doc'),
            title: cleanText(body.title, 'title'),
            number: cleanText(body.number, 'number', { max: 80 }),
            type: cleanText(body.type, 'type', { max: 80 }),
            status: body.status || 'Draft',
            classification: body.classification || 'Internal',
            department: cleanText(body.department, 'department', { max: 120 }),
            library: cleanText(body.library, 'library', { max: 120 }),
            language: cleanText(body.language || 'English', 'language', { max: 80 }),
            sourcePath: body.sourcePath ? cleanText(body.sourcePath, 'sourcePath', { max: 1000 }) : null,
            summary: cleanText(body.summary || '', 'summary', { min: 0, max: 4000 }),
            retention: cleanText(body.retention || '7 years', 'retention', { max: 80 }),
            nextReview: cleanText(body.nextReview, 'nextReview', { max: 10 }),
            reviewer: cleanText(body.reviewer, 'reviewer', { max: 160 }),
            approver: cleanText(body.approver, 'approver', { max: 160 }),
            workflowStep: body.workflowStep || 1,
          }
          assert(
            documentStatuses.includes(input.status),
            422,
            'VALIDATION_ERROR',
            'Document status is invalid.',
          )
          assert(
            classifications.includes(input.classification),
            422,
            'VALIDATION_ERROR',
            'Classification is invalid.',
          )
          const document = await repository.createDocument(actor, input)
          if (search) await search.indexDocument(document)
          if (events) await events.publish({ type: 'document.created', documentId: document.id, tenantId: actor.tenantId })
          await audit(repository, req, actor, 'document.register', 'document', document.id)
          return sendJson(res, 201, { document })
        }
        if (route === '/api/v1/trash' && req.method === 'GET') {
          authorize(actor, 'document:read')
          const result = await repository.listDocuments(actor, { deleted: true, limit: 100 })
          return sendJson(res, 200, {
            documents: result.items,
            page: { nextCursor: result.nextCursor, limit: 100 },
          })
        }

        const documentMatch = route.match(/^\/api\/v1\/documents\/([^/]+)$/)
        if (documentMatch && req.method === 'GET') {
          authorize(actor, 'document:read')
          const document = await repository.getDocument(actor, decodeURIComponent(documentMatch[1]))
          assert(document, 404, 'NOT_FOUND', 'Document not found.')
          authorize(actor, 'document:read', document)
          await audit(repository, req, actor, 'document.view', 'document', document.id)
          return sendJson(res, 200, { document })
        }
        if (documentMatch && req.method === 'PATCH') {
          authorize(actor, 'document:write')
          const body = await readJson(req, config.bodyLimit)
          if (body.status !== undefined)
            assert(
              documentStatuses.includes(body.status),
              422,
              'VALIDATION_ERROR',
              'Document status is invalid.',
            )
          if (body.classification !== undefined)
            assert(
              classifications.includes(body.classification),
              422,
              'VALIDATION_ERROR',
              'Classification is invalid.',
            )
          if (body.title !== undefined) body.title = cleanText(body.title, 'title')
          if (body.summary !== undefined)
            body.summary = cleanText(body.summary, 'summary', { min: 0, max: 4000 })
          const document = await repository.updateDocument(actor, decodeURIComponent(documentMatch[1]), body)
          assert(document, 404, 'NOT_FOUND', 'Document not found or no editable fields supplied.')
          await audit(repository, req, actor, 'document.update', 'document', document.id, 'success', {
            fields: Object.keys(body),
          })
          return sendJson(res, 200, { document })
        }
        if (documentMatch && req.method === 'DELETE') {
          authorize(actor, 'document:delete')
          const id = decodeURIComponent(documentMatch[1])
          const result = await repository.softDeleteDocument(actor, id)
          if (result.legalHold)
            throw new HttpError(409, 'LEGAL_HOLD', 'A document on legal hold cannot be deleted.')
          assert(result.changed, 404, 'NOT_FOUND', 'Document not found.')
          await audit(repository, req, actor, 'document.delete', 'document', id)
          return sendJson(res, 200, { success: true })
        }
        const restoreMatch = route.match(/^\/api\/v1\/trash\/([^/]+)\/restore$/)
        if (restoreMatch && req.method === 'POST') {
          authorize(actor, 'document:delete')
          const id = decodeURIComponent(restoreMatch[1])
          assert(
            await repository.restoreDocument(actor, id),
            404,
            'NOT_FOUND',
            'Document not found in trash.',
          )
          await audit(repository, req, actor, 'document.restore', 'document', id)
          return sendJson(res, 200, { success: true })
        }

        if (route === '/api/v1/uploads' && req.method === 'POST') {
          authorize(actor, 'document:write')
          const body = await readJson(req, config.bodyLimit)
          const upload = await uploads.create(actor, body, String(req.headers['idempotency-key'] || ''))
          await audit(repository, req, actor, 'upload.create', 'upload', upload.id)
          return sendJson(res, 201, {
            upload: publicUpload(upload),
            links: {
              chunk: `/api/v1/uploads/${upload.id}/chunks/{number}`,
              complete: `/api/v1/uploads/${upload.id}/complete`,
              cancel: `/api/v1/uploads/${upload.id}`,
            },
          })
        }
        const chunkMatch = route.match(/^\/api\/v1\/uploads\/([^/]+)\/chunks\/(\d+)$/)
        if (chunkMatch && req.method === 'PUT') {
          authorize(actor, 'document:write')
          const upload = await uploads.writeChunk(
            actor,
            decodeURIComponent(chunkMatch[1]),
            chunkMatch[2],
            req,
          )
          return sendJson(res, 200, { upload: publicUpload(upload) })
        }
        const completeMatch = route.match(/^\/api\/v1\/uploads\/([^/]+)\/complete$/)
        if (completeMatch && req.method === 'POST') {
          authorize(actor, 'document:write')
          const body = await readJson(req, config.bodyLimit)
          const result = await uploads.complete(
            actor,
            decodeURIComponent(completeMatch[1]),
            body.metadata || {},
          )
          await audit(repository, req, actor, 'document.create', 'document', result.document.id, 'success', {
            hash: result.document.contentHash,
          })
          return sendJson(res, 201, { upload: publicUpload(result.upload), document: result.document })
        }
        const uploadMatch = route.match(/^\/api\/v1\/uploads\/([^/]+)$/)
        if (uploadMatch && req.method === 'DELETE') {
          authorize(actor, 'document:write')
          const upload = await uploads.cancel(actor, decodeURIComponent(uploadMatch[1]))
          await audit(repository, req, actor, 'upload.cancel', 'upload', upload.id)
          return sendJson(res, 200, { upload: publicUpload(upload) })
        }

        if (route === '/api/v1/search' && req.method === 'POST') {
          authorize(actor, 'document:read')
          const body = await readJson(req, config.bodyLimit)
          const query = cleanText(body.query, 'query', { min: 1, max: 500 })
          if (body.filters?.status !== undefined)
            assert(documentStatuses.includes(body.filters.status), 422, 'VALIDATION_ERROR', 'Document status is invalid.')
          const requestedLimit = Number(body.limit || 25)
          assert(Number.isInteger(requestedLimit) && requestedLimit > 0, 422, 'VALIDATION_ERROR', 'limit must be a positive integer.')
          const searchLimit = Math.min(requestedLimit, 100)
          const result = await repository.listDocuments(actor, {
            q: query,
            status: body.filters?.status,
            limit: searchLimit,
          })
          if (search) {
            const key = `search:${actor.tenantId}:${query}:${body.filters?.status || ''}:${searchLimit}`
            const cached = cache ? await cache.get(key) : null
            const indexed = cached
              ? JSON.parse(cached)
              : await search.search(query, {
                  top: searchLimit,
                  filter: `tenantId eq '${String(actor.tenantId).replaceAll("'", "''")}'`,
                })
            if (!cached && cache) await cache.set(key, JSON.stringify(indexed), 30)
            if (indexed) {
              await audit(repository, req, actor, 'search.execute', 'search', null, 'success', {
                queryLength: query.length,
                count: indexed.items.length,
              })
              return sendJson(res, 200, { results: indexed.items, page: { nextCursor: null } })
            }
          }
          await audit(repository, req, actor, 'search.execute', 'search', null, 'success', {
            queryLength: query.length,
            count: result.items.length,
          })
          return sendJson(res, 200, { results: result.items, page: { nextCursor: result.nextCursor } })
        }

        if (route === '/api/v1/workflows' && req.method === 'GET') {
          authorize(actor, 'workflow:read')
          return sendJson(res, 200, { workflows: await repository.listWorkflows(actor) })
        }
        if (route === '/api/v1/workflows' && req.method === 'POST') {
          authorize(actor, 'document:write')
          assert(
            req.headers['idempotency-key'],
            400,
            'IDEMPOTENCY_KEY_REQUIRED',
            'An Idempotency-Key header is required.',
          )
          const body = await readJson(req, config.bodyLimit)
          cleanText(body.documentId, 'documentId')
          cleanText(body.name, 'name')
          assert(
            await repository.getDocument(actor, body.documentId),
            404,
            'NOT_FOUND',
            'Document not found.',
          )
          const workflow = await repository.createWorkflow(actor, { ...body, id: uuid('workflow') })
          await audit(repository, req, actor, 'workflow.start', 'workflow', workflow.id)
          return sendJson(res, 201, { workflow })
        }
        const decisionMatch = route.match(/^\/api\/v1\/workflows\/([^/]+)\/decision$/)
        if (decisionMatch && req.method === 'POST') {
          authorize(actor, 'workflow:approve')
          const body = await readJson(req, config.bodyLimit)
          assert(
            workflowDecisions.includes(body.status),
            422,
            'VALIDATION_ERROR',
            'Workflow decision is invalid.',
          )
          const workflow = await repository.decideWorkflow(
            actor,
            decodeURIComponent(decisionMatch[1]),
            body.status,
          )
          assert(workflow, 404, 'NOT_FOUND', 'Pending workflow not found.')
          await audit(repository, req, actor, 'workflow.decision', 'workflow', workflow.id, 'success', {
            status: body.status,
          })
          return sendJson(res, 200, { workflow })
        }

        if (route === '/api/v1/notifications' && req.method === 'GET') {
          authorize(actor, 'notification:read')
          const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 25), 1), 100)
          const result = await repository.listNotifications(actor, {
            cursor: parseCursor(url.searchParams.get('cursor')),
            limit,
          })
          return sendJson(res, 200, {
            notifications: result.items,
            page: { nextCursor: result.nextCursor, limit },
          })
        }
        if (route === '/api/v1/notifications/read' && req.method === 'POST') {
          authorize(actor, 'notification:read')
          const body = await readJson(req, config.bodyLimit)
          assert(
            body.ids === undefined || (Array.isArray(body.ids) && body.ids.length <= 100),
            422,
            'VALIDATION_ERROR',
            'ids must be an array of at most 100 items.',
          )
          const updated = await repository.markNotificationsRead(actor, body.ids)
          await audit(repository, req, actor, 'notification.read', 'notification', null, 'success', {
            updated,
          })
          return sendJson(res, 200, { updated })
        }
        if (route === '/api/v1/audit' && req.method === 'GET') {
          authorize(actor, 'audit:read')
          return sendJson(res, 200, {
            events: await repository.listAudit(
              actor,
              Math.min(Number(url.searchParams.get('limit') || 100), 200),
            ),
          })
        }
        if (route === '/api/v1/admin/overview' && req.method === 'GET') {
          authorize(actor, 'admin:read')
          await audit(repository, req, actor, 'admin.overview', 'admin', null)
          return sendJson(res, 200, { overview: await repository.getOverview(actor) })
        }

        const knownPath = route.match(
          /^\/api\/v1\/(documents|trash|uploads|search|workflows|notifications|audit|admin)(?:\/|$)/,
        )
        if (knownPath) {
          res.setHeader('allow', allowedMethods(route))
          throw new HttpError(
            405,
            'METHOD_NOT_ALLOWED',
            'The HTTP method is not supported for this resource.',
          )
        }
        throw new HttpError(404, 'NOT_FOUND', 'Route not found.')
      }

      if (req.method === 'GET' && existsSync(staticRoot)) return serveStatic(route, staticRoot, res)
      throw new HttpError(404, 'NOT_FOUND', 'Route not found.')
    } catch (error) {
      if (req.actor) {
        try {
          await audit(repository, req, req.actor, 'request.failed', 'http', req.url, 'failure', {
            code: error.code || 'INTERNAL_ERROR',
            method: req.method,
          })
        } catch (auditError) {
          console.error(
            JSON.stringify({
              level: 'error',
              event: 'audit.append.failed',
              requestId: req.requestId,
              message: auditError.message,
            }),
          )
        }
      }
      return sendError(res, error, req.requestId || `req_${crypto.randomUUID()}`)
    }
  }
  return createServer(handler)
}

function publicUpload(upload) {
  return {
    id: upload.id,
    fileName: upload.file_name,
    mimeType: upload.mime_type,
    sizeBytes: upload.size_bytes,
    chunkSize: upload.chunk_size,
    state: upload.state,
    receivedBytes: upload.received_bytes,
    contentHash: upload.content_hash,
    createdAt: upload.created_at,
    updatedAt: upload.updated_at,
  }
}
function allowedMethods(route) {
  if (route.includes('/chunks/')) return 'PUT'
  if (
    route.endsWith('/complete') ||
    route.endsWith('/restore') ||
    route.endsWith('/decision') ||
    route.endsWith('/read')
  )
    return 'POST'
  if (route.match(/\/documents\/[^/]+$/)) return 'GET, PATCH, DELETE'
  if (route.match(/\/uploads\/[^/]+$/)) return 'DELETE'
  return route.endsWith('/search') ? 'POST' : 'GET, POST'
}
function serveStatic(route, root, res) {
  const target = route === '/' ? 'index.html' : decodeURIComponent(route).replace(/^\/+/, '')
  let path = resolve(root, target)
  if (!path.startsWith(`${root}${sep}`) && path !== root)
    throw new HttpError(404, 'NOT_FOUND', 'Route not found.')
  if (!existsSync(path) || statSync(path).isDirectory()) path = resolve(root, 'index.html')
  res.writeHead(200, {
    'content-type': contentTypes[extname(path)] || 'application/octet-stream',
    'cache-control': path.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
  })
  createReadStream(path).pipe(res)
}
