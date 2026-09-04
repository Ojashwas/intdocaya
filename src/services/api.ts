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
  const me = await request<{ user: { id: string; name: string; email: string; roles: string[] } }>('/auth/me')
  return {
    id: me.user.id,
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
    const me = await request<{ user: { id: string; name: string; email: string; roles: string[] } }>(
      '/auth/me',
    )
    return {
      id: me.user.id,
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
export async function markNotificationRead(id: string) {
  return request<{ updated: number }>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' })
}
export async function markNotificationUnread(id: string) {
  return request<{ updated: number }>(`/notifications/${encodeURIComponent(id)}/unread`, { method: 'POST' })
}
export type NotificationPreferences = {
  workflowEnabled: boolean
  collaborationEnabled: boolean
  securityEnabled: boolean
  systemEnabled: boolean
  updatedAt: string | null
}
export async function getNotificationPreferences() {
  return (await request<{ preferences: NotificationPreferences }>('/notifications/preferences')).preferences
}
export async function updateNotificationPreferences(changes: Partial<NotificationPreferences>) {
  return (
    await request<{ preferences: NotificationPreferences }>('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(changes),
    })
  ).preferences
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
export type TenantSettings = {
  defaultLanguage: string
  defaultRetention: string
  requireWorkflowOnSubmit: boolean
  notifyOnDocumentEvents: boolean
  updatedBy: string
  updatedAt: string | null
}
export async function getAdminSettings() {
  return (await request<{ settings: TenantSettings }>('/admin/settings')).settings
}
export async function updateAdminSettings(changes: Partial<TenantSettings>) {
  return (
    await request<{ settings: TenantSettings }>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(changes),
    })
  ).settings
}
export type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  status: 'invited' | 'active' | 'suspended' | 'deprovisioned'
  created_at: string
  updated_at?: string
}
export async function listAdminUsers() {
  return (await request<{ users: AdminUser[] }>('/admin/users')).users
}
export async function createAdminUser(input: {
  name: string
  email: string
  role: string
  status?: AdminUser['status']
}) {
  return (
    await request<{ user: AdminUser }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ).user
}
export async function updateAdminUser(id: string, changes: Partial<Pick<AdminUser, 'role' | 'status'>>) {
  return (
    await request<{ user: AdminUser }>(`/admin/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    })
  ).user
}
export type ReadinessCheck = { status: string; error?: string }
export type Readiness = {
  status: 'ready' | 'not_ready'
  timestamp: string
  checks: Record<string, ReadinessCheck>
}
export async function getReadiness(): Promise<Readiness | null> {
  try {
    const response = await fetch('/health/ready')
    return (await response.json()) as Readiness
  } catch {
    return null
  }
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
export type AssistantReference = {
  id: string
  number: string
  title: string
  status: string
  department: string
  nextReview: string
}
export async function askAssistant(question: string) {
  return request<{ answer: string; references: AssistantReference[] }>('/assistant/ask', {
    method: 'POST',
    body: JSON.stringify({ question }),
  })
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
