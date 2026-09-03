import type {
  ControlledDocument,
  RegistrationInput,
  UserProfile,
  WorkflowStatus,
  WorkflowTask,
} from '../types'

type ErrorEnvelope = { error?: { code?: string; message?: string; requestId?: string } }

export class ApiError extends Error {
  status: number
  code: string
  requestId?: string
  constructor(status: number, payload: ErrorEnvelope) {
    super(payload.error?.message || `Request failed with ${status}`)
    this.status = status
    this.code = payload.error?.code || 'REQUEST_FAILED'
    this.requestId = payload.error?.requestId
  }
}

let accessToken = sessionStorage.getItem('docaya_access_token') || ''

async function request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    signal,
    headers: {
      accept: 'application/json',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  })
  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(response.status, payload as ErrorEnvelope)
  return payload as T
}

export async function developmentSignIn(): Promise<UserProfile> {
  const response = await fetch('/api/v1/auth/development-token', { method: 'POST' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(response.status, payload)
  accessToken = payload.accessToken
  sessionStorage.setItem('docaya_access_token', accessToken)
  const me = await request<{ user: { name: string; email: string; roles: string[] } }>('/auth/me')
  return {
    name: me.user.name,
    email: me.user.email,
    initials: me.user.name
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase(),
    role: me.user.roles[0] || 'viewer',
    department: 'Records & Governance',
  }
}

export function signOut() {
  accessToken = ''
  sessionStorage.removeItem('docaya_access_token')
}
export async function restoreSession() {
  if (!accessToken) return null
  try {
    const me = await request<{ user: { name: string; email: string; roles: string[] } }>('/auth/me')
    return {
      name: me.user.name,
      email: me.user.email,
      initials: me.user.name
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase(),
      role: me.user.roles[0] || 'viewer',
      department: 'Records & Governance',
    } satisfies UserProfile
  } catch {
    signOut()
    return null
  }
}
export async function listDocuments(query = '', signal?: AbortSignal) {
  return (
    await request<{ documents: ControlledDocument[] }>(
      `/documents?q=${encodeURIComponent(query)}&limit=100`,
      {},
      signal,
    )
  ).documents
}
export async function registerDocument(input: RegistrationInput, submit: boolean) {
  const number = generateNumber(input.department, input.type)
  return (
    await request<{ document: ControlledDocument }>('/documents', {
      method: 'POST',
      headers: { 'idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({
        ...input,
        number,
        status: submit ? 'Under Review' : 'Draft',
        workflowStep: submit ? 2 : 1,
      }),
    })
  ).document
}
export async function listWorkflows() {
  const payload = await request<{ workflows: Array<Record<string, unknown>> }>('/workflows')
  return payload.workflows.map(mapWorkflow)
}
export async function decideWorkflow(id: string, status: WorkflowStatus) {
  const payload = await request<{ workflow: Record<string, unknown> }>(
    `/workflows/${encodeURIComponent(id)}/decision`,
    { method: 'POST', headers: { 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ status }) },
  )
  return mapWorkflow(payload.workflow)
}
export async function updateDocument(id: string, changes: Partial<ControlledDocument>) {
  return (
    await request<{ document: ControlledDocument }>(`/documents/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    })
  ).document
}
export async function listNotifications() {
  return (
    await request<{
      notifications: Array<{
        id: string
        category: string
        title: string
        body: string
        priority: string
        readAt: string | null
        createdAt: string
      }>
    }>('/notifications?limit=100')
  ).notifications
}
export async function markAllNotificationsRead() {
  return request<{ updated: number }>('/notifications/read', { method: 'POST', body: '{}' })
}
export async function getOverview() {
  return (
    await request<{
      overview: {
        users: number
        documents: number
        trashedDocuments: number
        pendingWorkflows: number
        generatedAt: string
      }
    }>('/admin/overview')
  ).overview
}
export async function searchDocuments(query: string, signal: AbortSignal) {
  return (
    await request<{ results: ControlledDocument[] }>(
      '/search',
      { method: 'POST', body: JSON.stringify({ query, limit: 50 }) },
      signal,
    )
  ).results
}

function mapWorkflow(row: Record<string, unknown>): WorkflowTask {
  return {
    id: String(row.id),
    documentId: String(row.document_id),
    documentNumber: String(row.document_number || ''),
    documentTitle: String(row.document_title || row.name || ''),
    stage: String(row.name || 'Review'),
    assignee: 'Khalid Al Mansoori',
    requestedBy: 'Records Governance Office',
    dueDate: String(row.due_at || new Date().toISOString()).slice(0, 10),
    priority: 'Normal',
    status: String(row.status) as WorkflowStatus,
  }
}
function generateNumber(department: string, type: string) {
  const d =
    department
      .split(/\s|&/)
      .filter(Boolean)
      .slice(0, 3)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'DOC'
  const t =
    type
      .split(' ')
      .map((part) => part.slice(0, 2))
      .join('')
      .slice(0, 3)
      .toUpperCase() || 'GEN'
  return `${d}-${t}-${new Date().getUTCFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`
}
