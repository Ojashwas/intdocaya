import pg from 'pg'

const mapDocument = (row) =>
  row && {
    id: row.id,
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id,
    folderId: row.folder_id,
    number: row.document_number,
    title: row.title,
    type: row.doc_type,
    status: row.status,
    classification: row.classification,
    ownerId: row.owner_id,
    owner: row.owner_name,
    department: row.department,
    library: row.library,
    language: row.language,
    sourcePath: row.source_path,
    summary: row.summary,
    retention: row.retention,
    legalHold: row.legal_hold,
    revision: row.current_revision,
    nextReview: String(row.next_review).slice(0, 10),
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    contentHash: row.content_hash,
    reviewer: row.reviewer,
    approver: row.approver,
    workflowStep: row.workflow_step,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
const now = () => new Date().toISOString()

export class PostgresRepository {
  static async connect(connectionString) {
    const pool = new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: true },
      max: 20,
      idleTimeoutMillis: 30_000,
    })
    await pool.query('SELECT 1')
    const migration = await pool.query("SELECT to_regclass('public.schema_migrations') AS table_name")
    if (!migration.rows[0].table_name)
      throw new Error('PostgreSQL migrations have not been applied; refusing to start.')
    return new PostgresRepository(pool)
  }
  constructor(pool) {
    this.pool = pool
  }
  async close() {
    await this.pool.end()
  }
  async healthCheck() {
    await this.pool.query('SELECT 1')
    return true
  }
  async tenant(actor, work) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query("SELECT set_config('app.tenant_id',$1,true)", [actor.tenantId])
      const result = await work(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
  async listDocuments(actor, { q = '', status, cursor, limit = 25, deleted = false } = {}) {
    return this.tenant(actor, async (client) => {
      const where = ['tenant_id=$1', deleted ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL']
      const values = [actor.tenantId]
      if (q) {
        values.push(`%${q}%`)
        where.push(
          `(title ILIKE $${values.length} OR document_number ILIKE $${values.length} OR owner_name ILIKE $${values.length})`,
        )
      }
      if (status) {
        values.push(status)
        where.push(`status=$${values.length}`)
      }
      if (cursor) {
        values.push(cursor.updatedAt, cursor.id)
        where.push(
          `(updated_at < $${values.length - 1} OR (updated_at = $${values.length - 1} AND id < $${values.length}))`,
        )
      }
      values.push(limit + 1)
      const rows = (
        await client.query(
          `SELECT * FROM documents WHERE ${where.join(' AND ')} ORDER BY updated_at DESC,id DESC LIMIT $${values.length}`,
          values,
        )
      ).rows
      const page = rows.slice(0, limit)
      return {
        items: page.map(mapDocument),
        nextCursor:
          rows.length > limit
            ? Buffer.from(JSON.stringify({ updatedAt: page.at(-1).updated_at, id: page.at(-1).id })).toString(
                'base64url',
              )
            : null,
      }
    })
  }
  async getDocument(actor, id, includeDeleted = false) {
    return this.tenant(actor, async (client) =>
      mapDocument(
        (
          await client.query(
            `SELECT * FROM documents WHERE id=$1 AND tenant_id=$2 ${includeDeleted ? '' : 'AND deleted_at IS NULL'}`,
            [id, actor.tenantId],
          )
        ).rows[0],
      ),
    )
  }
  async createDocument(actor, input) {
    return this.tenant(actor, async (client) => {
      const timestamp = now()
      const values = [
        input.id,
        actor.tenantId,
        input.workspaceId || 'workspace-main',
        input.folderId || null,
        input.title,
        input.number,
        input.type,
        input.status || 'Draft',
        input.classification || 'Internal',
        actor.id,
        actor.name,
        input.department || 'Unassigned',
        input.library || 'Corporate Governance',
        input.language || 'English',
        input.sourcePath || null,
        input.summary || '',
        input.retention || '7 years',
        input.revision || 1,
        input.nextReview,
        input.mimeType || null,
        input.sizeBytes || 0,
        input.contentHash || null,
        input.reviewer,
        input.approver,
        input.workflowStep || 1,
        timestamp,
        timestamp,
      ]
      const result = await client.query(
        `INSERT INTO documents(id,tenant_id,workspace_id,folder_id,title,document_number,doc_type,status,classification,owner_id,owner_name,department,library,language,source_path,summary,retention,current_revision,next_review,mime_type,size_bytes,content_hash,reviewer,approver,workflow_step,created_at,updated_at) VALUES (${values.map((_, index) => `$${index + 1}`).join(',')}) RETURNING *`,
        values,
      )
      return mapDocument(result.rows[0])
    })
  }
  async updateDocument(actor, id, changes) {
    const mapping = {
      title: 'title',
      status: 'status',
      classification: 'classification',
      summary: 'summary',
      nextReview: 'next_review',
      legalHold: 'legal_hold',
    }
    const entries = Object.entries(changes).filter(([key]) => mapping[key])
    if (!entries.length) return null
    return this.tenant(actor, async (client) => {
      const values = entries.map(([, value]) => value)
      values.push(now(), id, actor.tenantId)
      const result = await client.query(
        `UPDATE documents SET ${entries.map(([key], index) => `${mapping[key]}=$${index + 1}`).join(',')},updated_at=$${entries.length + 1} WHERE id=$${entries.length + 2} AND tenant_id=$${entries.length + 3} AND deleted_at IS NULL RETURNING *`,
        values,
      )
      return mapDocument(result.rows[0])
    })
  }
  async softDeleteDocument(actor, id) {
    return this.tenant(actor, async (client) => {
      const existing = (
        await client.query(
          'SELECT legal_hold FROM documents WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL',
          [id, actor.tenantId],
        )
      ).rows[0]
      if (!existing) return { changed: false, legalHold: false }
      if (existing.legal_hold) return { changed: false, legalHold: true }
      const result = await client.query(
        'UPDATE documents SET deleted_at=now(),updated_at=now() WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL',
        [id, actor.tenantId],
      )
      return { changed: Boolean(result.rowCount), legalHold: false }
    })
  }
  async restoreDocument(actor, id) {
    return this.tenant(actor, async (client) =>
      Boolean(
        (
          await client.query(
            'UPDATE documents SET deleted_at=NULL,updated_at=now() WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NOT NULL',
            [id, actor.tenantId],
          )
        ).rowCount,
      ),
    )
  }
  async listWorkflows(actor) {
    return this.tenant(
      actor,
      async (client) =>
        (
          await client.query(
            'SELECT w.*,d.title document_title,d.document_number,d.status document_status FROM workflows w JOIN documents d ON d.id=w.document_id WHERE w.tenant_id=$1 AND w.assignee_id=$2 ORDER BY w.created_at DESC',
            [actor.tenantId, actor.id],
          )
        ).rows,
    )
  }
  async createWorkflow(actor, input) {
    return this.tenant(
      actor,
      async (client) =>
        (
          await client.query(
            "INSERT INTO workflows(id,tenant_id,document_id,name,status,assignee_id,due_at) VALUES ($1,$2,$3,$4,'Pending',$5,$6) RETURNING *",
            [
              input.id,
              actor.tenantId,
              input.documentId,
              input.name,
              input.assigneeId || actor.id,
              input.dueAt || null,
            ],
          )
        ).rows[0],
    )
  }
  async decideWorkflow(actor, id, status) {
    return this.tenant(
      actor,
      async (client) =>
        (
          await client.query(
            "UPDATE workflows SET status=$1,updated_at=now() WHERE id=$2 AND tenant_id=$3 AND assignee_id=$4 AND status='Pending' RETURNING *",
            [status, id, actor.tenantId, actor.id],
          )
        ).rows[0] || null,
    )
  }
  async listNotifications(actor, { cursor, limit = 25 } = {}) {
    return this.tenant(actor, async (client) => {
      const values = [actor.tenantId, actor.id]
      let condition = ''
      if (cursor) {
        values.push(cursor.createdAt, cursor.id)
        condition = `AND (created_at < $3 OR (created_at=$3 AND id<$4))`
      }
      values.push(limit + 1)
      const rows = (
        await client.query(
          `SELECT * FROM notifications WHERE tenant_id=$1 AND user_id=$2 ${condition} ORDER BY created_at DESC,id DESC LIMIT $${values.length}`,
          values,
        )
      ).rows
      const page = rows.slice(0, limit).map((row) => ({
        id: row.id,
        category: row.category,
        title: row.title,
        body: row.body,
        priority: row.priority,
        readAt: row.read_at,
        createdAt: row.created_at,
      }))
      return {
        items: page,
        nextCursor:
          rows.length > limit
            ? Buffer.from(
                JSON.stringify({ createdAt: rows[limit - 1].created_at, id: rows[limit - 1].id }),
              ).toString('base64url')
            : null,
      }
    })
  }
  async markNotificationsRead(actor, ids) {
    return this.tenant(actor, async (client) => {
      if (!ids?.length)
        return (
          await client.query(
            'UPDATE notifications SET read_at=now() WHERE tenant_id=$1 AND user_id=$2 AND read_at IS NULL',
            [actor.tenantId, actor.id],
          )
        ).rowCount
      return (
        await client.query(
          'UPDATE notifications SET read_at=now() WHERE tenant_id=$1 AND user_id=$2 AND id=ANY($3::text[])',
          [actor.tenantId, actor.id, ids],
        )
      ).rowCount
    })
  }
  async markNotificationUnread(actor, id) {
    return this.tenant(actor, async (client) =>
      Boolean(
        (
          await client.query(
            'UPDATE notifications SET read_at=NULL WHERE tenant_id=$1 AND user_id=$2 AND id=$3',
            [actor.tenantId, actor.id, id],
          )
        ).rowCount,
      ),
    )
  }
  async getNotificationPreferences(actor) {
    return this.tenant(actor, async (client) => {
      const row = (
        await client.query('SELECT * FROM notification_preferences WHERE tenant_id=$1 AND user_id=$2', [
          actor.tenantId,
          actor.id,
        ])
      ).rows[0]
      return {
        workflowEnabled: row?.workflow_enabled ?? true,
        collaborationEnabled: row?.collaboration_enabled ?? true,
        securityEnabled: row?.security_enabled ?? true,
        systemEnabled: row?.system_enabled ?? true,
        updatedAt: row?.updated_at || null,
      }
    })
  }
  async updateNotificationPreferences(actor, changes) {
    const current = await this.getNotificationPreferences(actor)
    const next = { ...current, ...changes }
    await this.tenant(actor, (client) =>
      client.query(
        `INSERT INTO notification_preferences(tenant_id,user_id,workflow_enabled,collaboration_enabled,security_enabled,system_enabled)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (tenant_id,user_id) DO UPDATE SET workflow_enabled=EXCLUDED.workflow_enabled,collaboration_enabled=EXCLUDED.collaboration_enabled,security_enabled=EXCLUDED.security_enabled,system_enabled=EXCLUDED.system_enabled,updated_at=now()`,
        [
          actor.tenantId,
          actor.id,
          next.workflowEnabled,
          next.collaborationEnabled,
          next.securityEnabled,
          next.systemEnabled,
        ],
      ),
    )
    return this.getNotificationPreferences(actor)
  }
  async listAdminUsers(actor) {
    return this.tenant(
      actor,
      async (client) =>
        (
          await client.query(
            'SELECT id,name,email,role,status,created_at,updated_at FROM users WHERE tenant_id=$1 ORDER BY name',
            [actor.tenantId],
          )
        ).rows,
    )
  }
  async getSettings(actor) {
    return this.tenant(actor, async (client) => {
      const row = (await client.query('SELECT * FROM tenant_settings WHERE tenant_id=$1', [actor.tenantId]))
        .rows[0]
      return {
        defaultLanguage: row?.default_language || 'English',
        defaultRetention: row?.default_retention || '7 years',
        requireWorkflowOnSubmit: row?.require_workflow_on_submit ?? true,
        notifyOnDocumentEvents: row?.notify_on_document_events ?? true,
        updatedBy: row?.updated_by || actor.id,
        updatedAt: row?.updated_at || null,
      }
    })
  }
  async updateSettings(actor, changes) {
    const current = await this.getSettings(actor)
    const next = { ...current, ...changes }
    await this.tenant(actor, (client) =>
      client.query(
        `INSERT INTO tenant_settings(tenant_id,default_language,default_retention,require_workflow_on_submit,notify_on_document_events,updated_by)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (tenant_id) DO UPDATE SET default_language=EXCLUDED.default_language,default_retention=EXCLUDED.default_retention,require_workflow_on_submit=EXCLUDED.require_workflow_on_submit,notify_on_document_events=EXCLUDED.notify_on_document_events,updated_by=EXCLUDED.updated_by,updated_at=now()`,
        [
          actor.tenantId,
          next.defaultLanguage,
          next.defaultRetention,
          next.requireWorkflowOnSubmit,
          next.notifyOnDocumentEvents,
          actor.id,
        ],
      ),
    )
    return this.getSettings(actor)
  }
  async appendAudit(event) {
    const actor = { tenantId: event.tenantId }
    return this.tenant(actor, async (client) => {
      await client.query('LOCK TABLE audit_events IN SHARE ROW EXCLUSIVE MODE')
      const previous =
        (
          await client.query(
            'SELECT hash FROM audit_events WHERE tenant_id=$1 ORDER BY sequence DESC LIMIT 1',
            [event.tenantId],
          )
        ).rows[0]?.hash || null
      await client.query(
        'INSERT INTO audit_events(id,tenant_id,actor_id,actor_name,action,object_type,object_id,outcome,request_id,source_ip,user_agent,detail,previous_hash,hash,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',
        [
          event.id,
          event.tenantId,
          event.actorId,
          event.actorName,
          event.action,
          event.objectType,
          event.objectId || null,
          event.outcome,
          event.requestId,
          event.sourceIp || null,
          event.userAgent || null,
          event.detail || {},
          previous,
          event.hash(previous),
          event.createdAt,
        ],
      )
    })
  }
  async listAudit(actor, limit = 100) {
    return this.tenant(
      actor,
      async (client) =>
        (
          await client.query(
            'SELECT id,actor_name,action,object_type,object_id,outcome,request_id,detail,previous_hash,hash,created_at FROM audit_events WHERE tenant_id=$1 ORDER BY sequence DESC LIMIT $2',
            [actor.tenantId, limit],
          )
        ).rows,
    )
  }
  async getOverview(actor) {
    return this.tenant(actor, async (client) => {
      const result = await client.query(
        "SELECT (SELECT count(*) FROM users WHERE tenant_id=$1 AND status='active') users,(SELECT count(*) FROM documents WHERE tenant_id=$1 AND deleted_at IS NULL) documents,(SELECT count(*) FROM documents WHERE tenant_id=$1 AND deleted_at IS NOT NULL) trashed,(SELECT count(*) FROM workflows WHERE tenant_id=$1 AND status='Pending') pending",
        [actor.tenantId],
      )
      const row = result.rows[0]
      return {
        users: Number(row.users),
        documents: Number(row.documents),
        trashedDocuments: Number(row.trashed),
        pendingWorkflows: Number(row.pending),
        generatedAt: now(),
      }
    })
  }
  async getUpload(actor, id) {
    return this.tenant(
      actor,
      async (client) =>
        (
          await client.query('SELECT * FROM upload_sessions WHERE id=$1 AND tenant_id=$2', [
            id,
            actor.tenantId,
          ])
        ).rows[0],
    )
  }
  async getUploadByIdempotency(actor, key) {
    return this.tenant(
      actor,
      async (client) =>
        (
          await client.query('SELECT * FROM upload_sessions WHERE tenant_id=$1 AND idempotency_key=$2', [
            actor.tenantId,
            key,
          ])
        ).rows[0],
    )
  }
  async createUpload(actor, upload) {
    return this.tenant(
      actor,
      async (client) =>
        (
          await client.query(
            "INSERT INTO upload_sessions(id,tenant_id,actor_id,idempotency_key,file_name,mime_type,size_bytes,chunk_size,state,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'created',$9) RETURNING *",
            [
              upload.id,
              actor.tenantId,
              actor.id,
              upload.idempotencyKey,
              upload.fileName,
              upload.mimeType,
              upload.sizeBytes,
              upload.chunkSize,
              upload.metadata,
            ],
          )
        ).rows[0],
    )
  }
  async updateUpload(actor, id, changes) {
    const mapping = {
      state: 'state',
      receivedBytes: 'received_bytes',
      contentHash: 'content_hash',
      documentId: 'document_id',
    }
    const entries = Object.entries(changes).filter(([key]) => mapping[key])
    if (!entries.length) return this.getUpload(actor, id)
    return this.tenant(actor, async (client) => {
      const values = entries.map(([, value]) => value)
      values.push(id, actor.tenantId)
      return (
        await client.query(
          `UPDATE upload_sessions SET ${entries.map(([key], index) => `${mapping[key]}=$${index + 1}`).join(',')},updated_at=now() WHERE id=$${entries.length + 1} AND tenant_id=$${entries.length + 2} RETURNING *`,
          values,
        )
      ).rows[0]
    })
  }
}
