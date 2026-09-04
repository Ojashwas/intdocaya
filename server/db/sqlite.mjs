import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const migrationDirectory = join(dirname(fileURLToPath(import.meta.url)), 'migrations')
const now = () => new Date().toISOString()
const bool = (value) => Boolean(value)
const parse = (value, fallback = {}) => {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

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
    legalHold: bool(row.legal_hold),
    revision: row.current_revision,
    nextReview: row.next_review,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    contentHash: row.content_hash,
    reviewer: row.reviewer,
    approver: row.approver,
    workflowStep: row.workflow_step,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }

export class SqliteRepository {
  constructor(path, { seed = false } = {}) {
    mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;')
    this.migrate()
    if (seed) this.seed()
  }

  migrate() {
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
    )
    const applied = this.db
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row) => row.version)
    for (const file of readdirSync(migrationDirectory)
      .filter((name) => name.endsWith('.sql'))
      .sort()) {
      if (applied.includes(file)) continue
      this.db.exec('BEGIN IMMEDIATE')
      try {
        this.db.exec(readFileSync(join(migrationDirectory, file), 'utf8'))
        this.db.prepare('INSERT INTO schema_migrations(version,applied_at) VALUES (?,?)').run(file, now())
        this.db.exec('COMMIT')
      } catch (error) {
        this.db.exec('ROLLBACK')
        throw error
      }
    }
  }

  seed() {
    const timestamp = now()
    this.db
      .prepare(
        "INSERT OR IGNORE INTO workspaces(id,tenant_id,name,created_at) VALUES ('workspace-main','local-tenant','Corporate Records',?)",
      )
      .run(timestamp)
    this.db
      .prepare(
        "INSERT OR IGNORE INTO users(id,tenant_id,name,email,role,status,created_at) VALUES ('local-user','local-tenant','Khalid Al Mansoori','k.mansoori@docaya.local','org-admin','active',?)",
      )
      .run(timestamp)
    const count = this.db
      .prepare("SELECT COUNT(*) count FROM documents WHERE tenant_id='local-tenant'")
      .get().count
    if (count) return
    const statement = this.db.prepare(`INSERT INTO documents
      (id,tenant_id,workspace_id,title,document_number,doc_type,status,classification,owner_id,owner_name,department,library,language,source_path,summary,retention,current_revision,next_review,size_bytes,reviewer,approver,workflow_step,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    const rows = [
      [
        'doc-1',
        'Document Control Procedure',
        'COR-QMS-PRO-00014',
        'Procedure',
        'Published',
        'Internal',
        'QMS Office',
        'Policy & Strategy',
        'Corporate Governance',
        'English / Arabic',
        'Controls the creation, review, approval, issue and retirement of organizational documents.',
        '7 years',
        4,
        '2027-01-10',
        'Department Quality Lead',
        'Director, Policy & Strategy',
        4,
      ],
      [
        'doc-2',
        'Emergency Response Protocol',
        'CIV-EMR-PRO-00004',
        'Procedure',
        'Published',
        'Restricted',
        'Civil Defence',
        'Civil Defence',
        'Emergency Management',
        'Arabic / English',
        'Defines coordinated response actions for priority national emergency scenarios.',
        'Permanent',
        4,
        '2026-12-01',
        'Emergency Planning Committee',
        'Commander, Civil Defence',
        4,
      ],
      [
        'doc-3',
        'Evidence Handling Standard',
        'FOR-EVD-STD-00009',
        'Standard',
        'Under Review',
        'Restricted',
        'Forensic Sciences',
        'Forensic Sciences',
        'Security & Compliance',
        'English',
        'Sets chain-of-custody and evidence preservation controls for forensic operations.',
        'Permanent',
        3,
        '2026-09-05',
        'Forensic Quality Committee',
        'Director, Forensic Sciences',
        2,
      ],
      [
        'doc-4',
        'Data Protection Policy',
        'LEG-DPP-POL-00002',
        'Policy',
        'Draft',
        'Confidential',
        'Legal & Compliance',
        'Legal & Compliance',
        'Security & Compliance',
        'Arabic / English',
        'Organization-wide policy for the lawful and secure handling of personal information.',
        'Permanent',
        2,
        '2026-10-15',
        'Data Protection Office',
        'General Counsel',
        1,
      ],
      [
        'doc-5',
        'Traffic Incident SLA Guide',
        'TRF-SLA-WI-00021',
        'Work Instruction',
        'Under Approval',
        'Internal',
        'Traffic & Patrols',
        'Traffic & Patrols',
        'Operational Procedures',
        'Arabic / English',
        'Service-level targets and escalation path for traffic incident response.',
        '5 years',
        1,
        '2026-11-20',
        'Traffic Quality Lead',
        'Director, Traffic & Patrols',
        3,
      ],
    ]
    for (const row of rows)
      statement.run(
        row[0],
        'local-tenant',
        'workspace-main',
        row[1],
        row[2],
        row[3],
        row[4],
        row[5],
        'local-user',
        row[6],
        row[7],
        row[8],
        row[9],
        `SharePoint / ${row[8]}`,
        row[10],
        row[11],
        row[12],
        row[13],
        0,
        row[14],
        row[15],
        row[16],
        timestamp,
        timestamp,
      )
    const tasks = [
      ['task-1', 'doc-3', 'Review Evidence Handling Standard', 'local-user', '2026-09-05T17:00:00Z'],
      ['task-2', 'doc-5', 'Approve Traffic Incident SLA Guide', 'local-user', '2026-09-07T17:00:00Z'],
    ]
    for (const task of tasks)
      this.db
        .prepare(
          "INSERT INTO workflows(id,tenant_id,document_id,name,status,assignee_id,due_at,created_at,updated_at) VALUES (?,'local-tenant',?,?,'Pending',?,?,?,?)",
        )
        .run(...task, timestamp, timestamp)
    this.db
      .prepare(
        "INSERT INTO notifications(id,tenant_id,user_id,category,title,body,priority,created_at) VALUES ('notification-1','local-tenant','local-user','workflow','Approval requested','Evidence Handling Standard is ready for your review.','critical',?)",
      )
      .run(timestamp)
  }

  close() {
    this.db.close()
  }

  listDocuments(actor, { q = '', status, cursor, limit = 25, deleted = false } = {}) {
    const conditions = ['tenant_id = ?', deleted ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL']
    const values = [actor.tenantId]
    if (q) {
      conditions.push(
        '(lower(title) LIKE lower(?) OR lower(document_number) LIKE lower(?) OR lower(owner_name) LIKE lower(?))',
      )
      values.push(`%${q}%`, `%${q}%`, `%${q}%`)
    }
    if (status) {
      conditions.push('status = ?')
      values.push(status)
    }
    if (cursor) {
      conditions.push('(updated_at < ? OR (updated_at = ? AND id < ?))')
      values.push(cursor.updatedAt, cursor.updatedAt, cursor.id)
    }
    const rows = this.db
      .prepare(
        `SELECT * FROM documents WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC,id DESC LIMIT ?`,
      )
      .all(...values, limit + 1)
    const hasMore = rows.length > limit
    const page = rows.slice(0, limit)
    return {
      items: page.map(mapDocument),
      nextCursor: hasMore
        ? Buffer.from(JSON.stringify({ updatedAt: page.at(-1).updated_at, id: page.at(-1).id })).toString(
            'base64url',
          )
        : null,
    }
  }

  getDocument(actor, id, includeDeleted = false) {
    return mapDocument(
      this.db
        .prepare(
          `SELECT * FROM documents WHERE id=? AND tenant_id=? ${includeDeleted ? '' : 'AND deleted_at IS NULL'}`,
        )
        .get(id, actor.tenantId),
    )
  }

  createDocument(actor, input) {
    const timestamp = now()
    this.db
      .prepare(
        `INSERT INTO documents (id,tenant_id,workspace_id,folder_id,title,document_number,doc_type,status,classification,owner_id,owner_name,department,library,language,source_path,summary,retention,current_revision,next_review,mime_type,size_bytes,content_hash,reviewer,approver,workflow_step,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
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
        input.department || actor.department || 'Unassigned',
        input.library || 'Corporate Governance',
        input.language || 'English',
        input.sourcePath || null,
        input.summary || '',
        input.retention || '7 years',
        input.revision || 1,
        input.nextReview || timestamp.slice(0, 10),
        input.mimeType || null,
        input.sizeBytes || 0,
        input.contentHash || null,
        input.reviewer || 'Department Quality Lead',
        input.approver || 'Records Governance Office',
        input.workflowStep || 1,
        timestamp,
        timestamp,
      )
    return this.getDocument(actor, input.id)
  }

  updateDocument(actor, id, changes) {
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
    const result = this.db
      .prepare(
        `UPDATE documents SET ${entries.map(([key]) => `${mapping[key]}=?`).join(',')},updated_at=? WHERE id=? AND tenant_id=? AND deleted_at IS NULL`,
      )
      .run(
        ...entries.map(([key, value]) => (key === 'legalHold' ? Number(Boolean(value)) : value)),
        now(),
        id,
        actor.tenantId,
      )
    return result.changes ? this.getDocument(actor, id) : null
  }

  softDeleteDocument(actor, id) {
    const document = this.getDocument(actor, id)
    if (!document || document.legalHold) return { changed: false, legalHold: Boolean(document?.legalHold) }
    return {
      changed: Boolean(
        this.db
          .prepare(
            'UPDATE documents SET deleted_at=?,updated_at=? WHERE id=? AND tenant_id=? AND deleted_at IS NULL',
          )
          .run(now(), now(), id, actor.tenantId).changes,
      ),
      legalHold: false,
    }
  }

  restoreDocument(actor, id) {
    return Boolean(
      this.db
        .prepare(
          'UPDATE documents SET deleted_at=NULL,updated_at=? WHERE id=? AND tenant_id=? AND deleted_at IS NOT NULL',
        )
        .run(now(), id, actor.tenantId).changes,
    )
  }

  listWorkflows(actor) {
    return this.db
      .prepare(
        `SELECT w.*,d.title document_title,d.document_number,d.status document_status FROM workflows w JOIN documents d ON d.id=w.document_id WHERE w.tenant_id=? AND w.assignee_id=? ORDER BY w.created_at DESC`,
      )
      .all(actor.tenantId, actor.id)
  }

  createWorkflow(actor, input) {
    const id = input.id
    const timestamp = now()
    this.db
      .prepare(
        "INSERT INTO workflows(id,tenant_id,document_id,name,status,assignee_id,due_at,created_at,updated_at) VALUES (?,?,?,?,'Pending',?,?,?,?)",
      )
      .run(
        id,
        actor.tenantId,
        input.documentId,
        input.name,
        input.assigneeId || actor.id,
        input.dueAt || null,
        timestamp,
        timestamp,
      )
    return this.db.prepare('SELECT * FROM workflows WHERE id=?').get(id)
  }

  decideWorkflow(actor, id, status) {
    const result = this.db
      .prepare(
        'UPDATE workflows SET status=?,updated_at=? WHERE id=? AND tenant_id=? AND assignee_id=? AND status=?',
      )
      .run(status, now(), id, actor.tenantId, actor.id, 'Pending')
    return result.changes ? this.db.prepare('SELECT * FROM workflows WHERE id=?').get(id) : null
  }

  listNotifications(actor, { cursor, limit = 25 } = {}) {
    const values = [actor.tenantId, actor.id]
    let cursorSql = ''
    if (cursor) {
      cursorSql = 'AND (created_at < ? OR (created_at = ? AND id < ?))'
      values.push(cursor.createdAt, cursor.createdAt, cursor.id)
    }
    const rows = this.db
      .prepare(
        `SELECT * FROM notifications WHERE tenant_id=? AND user_id=? ${cursorSql} ORDER BY created_at DESC,id DESC LIMIT ?`,
      )
      .all(...values, limit + 1)
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
  }

  markNotificationsRead(actor, ids) {
    const timestamp = now()
    if (!ids?.length)
      return this.db
        .prepare('UPDATE notifications SET read_at=? WHERE tenant_id=? AND user_id=? AND read_at IS NULL')
        .run(timestamp, actor.tenantId, actor.id).changes
    const placeholders = ids.map(() => '?').join(',')
    return this.db
      .prepare(
        `UPDATE notifications SET read_at=? WHERE tenant_id=? AND user_id=? AND id IN (${placeholders})`,
      )
      .run(timestamp, actor.tenantId, actor.id, ...ids).changes
  }

  markNotificationUnread(actor, id) {
    return Boolean(
      this.db
        .prepare('UPDATE notifications SET read_at=NULL WHERE tenant_id=? AND user_id=? AND id=?')
        .run(actor.tenantId, actor.id, id).changes,
    )
  }

  getNotificationPreferences(actor) {
    const row = this.db
      .prepare('SELECT * FROM notification_preferences WHERE tenant_id=? AND user_id=?')
      .get(actor.tenantId, actor.id)
    return row
      ? {
          workflowEnabled: Boolean(row.workflow_enabled),
          collaborationEnabled: Boolean(row.collaboration_enabled),
          securityEnabled: Boolean(row.security_enabled),
          systemEnabled: Boolean(row.system_enabled),
          updatedAt: row.updated_at,
        }
      : {
          workflowEnabled: true,
          collaborationEnabled: true,
          securityEnabled: true,
          systemEnabled: true,
          updatedAt: null,
        }
  }

  updateNotificationPreferences(actor, changes) {
    const current = this.getNotificationPreferences(actor)
    const next = { ...current, ...changes, updatedAt: now() }
    this.db
      .prepare(
        `INSERT INTO notification_preferences(tenant_id,user_id,workflow_enabled,collaboration_enabled,security_enabled,system_enabled,updated_at)
         VALUES (?,?,?,?,?,?,?)
         ON CONFLICT(tenant_id,user_id) DO UPDATE SET workflow_enabled=excluded.workflow_enabled,collaboration_enabled=excluded.collaboration_enabled,security_enabled=excluded.security_enabled,system_enabled=excluded.system_enabled,updated_at=excluded.updated_at`,
      )
      .run(
        actor.tenantId,
        actor.id,
        Number(next.workflowEnabled),
        Number(next.collaborationEnabled),
        Number(next.securityEnabled),
        Number(next.systemEnabled),
        next.updatedAt,
      )
    return this.getNotificationPreferences(actor)
  }

  listAdminUsers(actor) {
    return this.db
      .prepare(
        'SELECT id,name,email,role,status,created_at,updated_at FROM users WHERE tenant_id=? ORDER BY name',
      )
      .all(actor.tenantId)
  }

  getSettings(actor) {
    const row = this.db.prepare('SELECT * FROM tenant_settings WHERE tenant_id=?').get(actor.tenantId)
    return row
      ? {
          defaultLanguage: row.default_language,
          defaultRetention: row.default_retention,
          requireWorkflowOnSubmit: Boolean(row.require_workflow_on_submit),
          notifyOnDocumentEvents: Boolean(row.notify_on_document_events),
          updatedBy: row.updated_by,
          updatedAt: row.updated_at,
        }
      : {
          defaultLanguage: 'English',
          defaultRetention: '7 years',
          requireWorkflowOnSubmit: true,
          notifyOnDocumentEvents: true,
          updatedBy: actor.id,
          updatedAt: null,
        }
  }

  updateSettings(actor, changes) {
    const next = { ...this.getSettings(actor), ...changes, updatedBy: actor.id, updatedAt: now() }
    this.db
      .prepare(
        `INSERT INTO tenant_settings(tenant_id,default_language,default_retention,require_workflow_on_submit,notify_on_document_events,updated_by,updated_at)
         VALUES (?,?,?,?,?,?,?)
         ON CONFLICT(tenant_id) DO UPDATE SET default_language=excluded.default_language,default_retention=excluded.default_retention,require_workflow_on_submit=excluded.require_workflow_on_submit,notify_on_document_events=excluded.notify_on_document_events,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
      )
      .run(
        actor.tenantId,
        next.defaultLanguage,
        next.defaultRetention,
        Number(next.requireWorkflowOnSubmit),
        Number(next.notifyOnDocumentEvents),
        actor.id,
        next.updatedAt,
      )
    return this.getSettings(actor)
  }

  appendAudit(event) {
    const previous =
      this.db
        .prepare('SELECT hash FROM audit_events WHERE tenant_id=? ORDER BY sequence DESC LIMIT 1')
        .get(event.tenantId)?.hash || null
    this.db
      .prepare(
        'INSERT INTO audit_events(id,tenant_id,actor_id,actor_name,action,object_type,object_id,outcome,request_id,source_ip,user_agent,detail,previous_hash,hash,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      )
      .run(
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
        JSON.stringify(event.detail || {}),
        previous,
        event.hash(previous),
        event.createdAt,
      )
  }

  listAudit(actor, limit = 100) {
    return this.db
      .prepare(
        'SELECT id,actor_name,action,object_type,object_id,outcome,request_id,detail,previous_hash,hash,created_at FROM audit_events WHERE tenant_id=? ORDER BY sequence DESC LIMIT ?',
      )
      .all(actor.tenantId, limit)
      .map((row) => ({ ...row, detail: parse(row.detail) }))
  }

  getOverview(actor) {
    const scalar = (sql) => this.db.prepare(sql).get(actor.tenantId).count
    return {
      users: scalar("SELECT COUNT(*) count FROM users WHERE tenant_id=? AND status='active'"),
      documents: scalar('SELECT COUNT(*) count FROM documents WHERE tenant_id=? AND deleted_at IS NULL'),
      trashedDocuments: scalar(
        'SELECT COUNT(*) count FROM documents WHERE tenant_id=? AND deleted_at IS NOT NULL',
      ),
      pendingWorkflows: scalar("SELECT COUNT(*) count FROM workflows WHERE tenant_id=? AND status='Pending'"),
      generatedAt: now(),
    }
  }

  getUpload(actor, id) {
    const row = this.db
      .prepare('SELECT * FROM upload_sessions WHERE id=? AND tenant_id=?')
      .get(id, actor.tenantId)
    return row && { ...row, metadata: parse(row.metadata) }
  }
  getUploadByIdempotency(actor, key) {
    const row = this.db
      .prepare('SELECT * FROM upload_sessions WHERE tenant_id=? AND idempotency_key=?')
      .get(actor.tenantId, key)
    return row && { ...row, metadata: parse(row.metadata) }
  }
  createUpload(actor, upload) {
    const timestamp = now()
    this.db
      .prepare(
        "INSERT INTO upload_sessions(id,tenant_id,actor_id,idempotency_key,file_name,mime_type,size_bytes,chunk_size,state,metadata,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,'created',?,?,?)",
      )
      .run(
        upload.id,
        actor.tenantId,
        actor.id,
        upload.idempotencyKey,
        upload.fileName,
        upload.mimeType,
        upload.sizeBytes,
        upload.chunkSize,
        JSON.stringify(upload.metadata),
        timestamp,
        timestamp,
      )
    return this.getUpload(actor, upload.id)
  }
  updateUpload(actor, id, changes) {
    const allowed = {
      state: 'state',
      receivedBytes: 'received_bytes',
      contentHash: 'content_hash',
      documentId: 'document_id',
    }
    const entries = Object.entries(changes).filter(([key]) => allowed[key])
    if (!entries.length) return this.getUpload(actor, id)
    this.db
      .prepare(
        `UPDATE upload_sessions SET ${entries.map(([key]) => `${allowed[key]}=?`).join(',')},updated_at=? WHERE id=? AND tenant_id=?`,
      )
      .run(...entries.map(([, value]) => value), now(), id, actor.tenantId)
    return this.getUpload(actor, id)
  }
}
