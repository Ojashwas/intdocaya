import {
  Activity,
  Database,
  FileCheck2,
  HardDrive,
  Search,
  ServerCog,
  ShieldCheck,
  SlidersHorizontal,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import type { AdminUser, Readiness, TenantSettings } from '../../services/api'

type Overview = {
  users: number
  documents: number
  trashedDocuments: number
  pendingWorkflows: number
  generatedAt: string
}

const assignableRoles = [
  'org-admin',
  'workspace-admin',
  'content-manager',
  'contributor',
  'viewer',
  'guest',
  'auditor',
]
const roleLabels: Record<string, string> = {
  'org-admin': 'Org admin',
  'workspace-admin': 'Workspace admin',
  'content-manager': 'Content manager',
  contributor: 'Contributor',
  viewer: 'Viewer',
  guest: 'Guest',
  auditor: 'Auditor',
}
const healthLabels: Record<string, string> = {
  database: 'Authoritative metadata store',
  search: 'Search index',
  cache: 'Cache & rate limiting',
  events: 'Event bus (Service Bus)',
}
const healthStatusCopy = (status?: string, error?: string) => {
  if (status === 'ok') return 'Connected'
  if (status === 'disabled') return 'Not configured'
  return error || 'Unavailable'
}

export function AdminCenter({
  overview,
  settings,
  users,
  readiness,
  currentUserId,
  onSaveSettings,
  onInviteUser,
  onUpdateUser,
}: {
  overview: Overview | null
  settings: TenantSettings | null
  users: AdminUser[]
  readiness: Readiness | null
  currentUserId?: string
  onSaveSettings: (changes: Partial<TenantSettings>) => Promise<void>
  onInviteUser: (input: { name: string; email: string; role: string }) => Promise<void>
  onUpdateUser: (id: string, changes: Partial<Pick<AdminUser, 'role' | 'status'>>) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState<'overview' | 'users' | 'settings'>('overview')
  const [userQuery, setUserQuery] = useState('')
  const [userStatus, setUserStatus] = useState('all')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [rowBusyId, setRowBusyId] = useState<string | null>(null)
  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const haystack = `${user.name || ''} ${user.email || ''} ${user.role || ''}`.toLowerCase()
        return haystack.includes(userQuery.toLowerCase()) && (userStatus === 'all' || user.status === userStatus)
      }),
    [users, userQuery, userStatus],
  )
  const activeUsers = users.filter((user) => user.status === 'active').length
  const servicesReady = readiness?.status === 'ready'
  const changeStatus = async (id: string, status: AdminUser['status']) => {
    setRowBusyId(id)
    try {
      await onUpdateUser(id, { status })
    } catch {
      /* surfaced via parent error state */
    } finally {
      setRowBusyId(null)
    }
  }
  const changeRole = async (id: string, role: string) => {
    setRowBusyId(id)
    try {
      await onUpdateUser(id, { role })
    } catch {
      /* surfaced via parent error state */
    } finally {
      setRowBusyId(null)
    }
  }
  return (
    <div className="page-content admin-page">
      <section className="page-heading">
        <div>
          <p className="kicker">TENANT CONTROL PLANE</p>
          <h1>Admin Center</h1>
          <p>Live governance, platform health and configuration for this tenant.</p>
        </div>
        <span className={`health-pill${readiness && !servicesReady ? ' health-pill-warn' : ''}`}>
          <i />{' '}
          {!readiness
            ? 'Checking service health…'
            : servicesReady
              ? 'All services operational'
              : 'Some services degraded'}
        </span>
      </section>
      <div className="section-tabs admin-tabs" role="tablist" aria-label="Administration sections">
        <AdminTab active={section === 'overview'} onClick={() => setSection('overview')} icon={<Activity />} label="Overview" />
        <AdminTab active={section === 'users'} onClick={() => setSection('users')} icon={<Users />} label={`Users (${activeUsers})`} />
        <AdminTab active={section === 'settings'} onClick={() => setSection('settings')} icon={<SlidersHorizontal />} label="Governance settings" />
      </div>
      {section === 'overview' && !overview ? (
        <div className="panel loading-panel" role="status">
          Loading trusted administration metrics…
        </div>
      ) : section === 'overview' && overview ? (
        <>
        <section className="metric-grid">
          <AdminMetric icon={<Users />} label="Active users" value={overview.users} />
          <AdminMetric icon={<FileCheck2 />} label="Controlled documents" value={overview.documents} />
          <AdminMetric icon={<Activity />} label="Pending workflows" value={overview.pendingWorkflows} />
          <AdminMetric icon={<Database />} label="Items in trash" value={overview.trashedDocuments} />
        </section>
        </>
      ) : null}
      {section === 'overview' && (
      <section className="admin-grid">
        <article className="panel">
          <p className="kicker">SERVICE HEALTH</p>
          <h2>Platform dependencies</h2>
          <ul className="health-list">
            <li>
              <ServerCog />
              <span>
                <strong>Docaya API</strong>
                <small>{readiness ? 'Operational' : 'Checking…'}</small>
              </span>
              <i />
            </li>
            {readiness
              ? Object.entries(readiness.checks).map(([name, check]) => (
                  <li key={name}>
                    <Database />
                    <span>
                      <strong>{healthLabels[name] || name}</strong>
                      <small>{healthStatusCopy(check.status, check.error)}</small>
                    </span>
                    {check.status === 'ok' || check.status === 'disabled' ? <i /> : <b />}
                  </li>
                ))
              : (
                <li>
                  <Database />
                  <span>
                    <strong>Authoritative metadata store</strong>
                    <small>Checking…</small>
                  </span>
                  <i />
                </li>
              )}
            <li>
              <HardDrive />
              <span>
                <strong>Document storage</strong>
                <small>Development quarantine adapter</small>
              </span>
              <b />
            </li>
          </ul>
        </article>
        <article className="panel">
          <p className="kicker">SECURITY POSTURE</p>
          <h2>Enforced controls</h2>
          <ul className="control-list">
            <li>
              <ShieldCheck />
              Authenticated API boundary
            </li>
            <li>
              <ShieldCheck />
              Deny-by-default capabilities
            </li>
            <li>
              <ShieldCheck />
              Hash-chained audit events
            </li>
            <li>
              <ShieldCheck />
              Quarantine before document commit
            </li>
          </ul>
        </article>
      </section>
      )}
      {section === 'users' && (
      <section className="panel admin-directory">
        <div className="panel-heading">
          <div>
            <p className="kicker">DIRECTORY</p>
            <h2>Users and access posture</h2>
          </div>
          <span className="data-freshness">{filteredUsers.length} shown</span>
        </div>
        <div className="admin-filters">
          <label className="admin-search">
            <Search size={16} />
            <input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="Search name, email or role" />
          </label>
          <select aria-label="Filter users by status" value={userStatus} onChange={(event) => setUserStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="suspended">Suspended</option>
            <option value="deprovisioned">Deprovisioned</option>
          </select>
          <button type="button" className="primary-button" onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} /> Invite user
          </button>
        </div>
        <div className="admin-user-table" role="table" aria-label="Tenant users">
          <div className="admin-user-row admin-user-head" role="row">
            <span>Name</span><span>Role</span><span>Status</span><span>Created</span><span>Actions</span>
          </div>
          {filteredUsers.map((user, index) => {
            const isSelf = Boolean(currentUserId) && user.id === currentUserId
            const busy = rowBusyId === user.id
            return (
              <div className="admin-user-row" role="row" key={user.id || user.email || index}>
                <span><strong>{user.name || 'Workspace user'}</strong><small>{user.email || 'No email recorded'}</small></span>
                <span>
                  <select
                    aria-label={`Role for ${user.name || user.email}`}
                    value={user.role}
                    disabled={busy}
                    onChange={(event) => void changeRole(user.id, event.target.value)}
                  >
                    {assignableRoles.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role] || role}
                      </option>
                    ))}
                  </select>
                </span>
                <span><b className={`status-badge ${(user.status || 'unknown').toLowerCase()}`}>{user.status || 'Unknown'}</b></span>
                <span>{new Intl.DateTimeFormat('en-AE', { dateStyle: 'medium' }).format(new Date(user.created_at))}</span>
                <span className="admin-user-actions">
                  {user.status !== 'active' && (
                    <button type="button" className="secondary-button" disabled={busy} onClick={() => void changeStatus(user.id, 'active')}>
                      Activate
                    </button>
                  )}
                  {user.status !== 'suspended' && (
                    <button type="button" className="secondary-button" disabled={busy || isSelf} title={isSelf ? 'You cannot suspend your own account.' : undefined} onClick={() => void changeStatus(user.id, 'suspended')}>
                      Suspend
                    </button>
                  )}
                  {user.status !== 'deprovisioned' && (
                    <button type="button" className="danger-button" disabled={busy || isSelf} title={isSelf ? 'You cannot deprovision your own account.' : undefined} onClick={() => void changeStatus(user.id, 'deprovisioned')}>
                      Deprovision
                    </button>
                  )}
                </span>
              </div>
            )
          })}
          {!filteredUsers.length && <p className="empty-copy">No users match the selected filters.</p>}
        </div>
      </section>
      )}
      {inviteOpen && (
        <InviteUserModal
          busy={inviteBusy}
          error={inviteError}
          onClose={() => {
            setInviteOpen(false)
            setInviteError('')
          }}
          onSubmit={async (input) => {
            setInviteBusy(true)
            setInviteError('')
            try {
              await onInviteUser(input)
              setInviteOpen(false)
            } catch (problem) {
              setInviteError(problem instanceof Error ? problem.message : 'The invitation could not be sent.')
            } finally {
              setInviteBusy(false)
            }
          }}
        />
      )}
      {section === 'settings' && (
      <section className="admin-grid">
        <article className="panel">
          <p className="kicker">TENANT SETTINGS</p>
          <h2>Workspace defaults</h2>
          {!settings ? (
            <p>Settings are loading…</p>
          ) : (
            <form
              onSubmit={async (event) => {
                event.preventDefault()
                setSaving(true)
                try {
                  await onSaveSettings({
                    defaultLanguage: (
                      event.currentTarget.elements.namedItem('defaultLanguage') as HTMLSelectElement
                    ).value,
                    defaultRetention: (
                      event.currentTarget.elements.namedItem('defaultRetention') as HTMLSelectElement
                    ).value,
                    requireWorkflowOnSubmit: (
                      event.currentTarget.elements.namedItem('requireWorkflowOnSubmit') as HTMLInputElement
                    ).checked,
                    notifyOnDocumentEvents: (
                      event.currentTarget.elements.namedItem('notifyOnDocumentEvents') as HTMLInputElement
                    ).checked,
                  })
                } finally {
                  setSaving(false)
                }
              }}
            >
              <label>
                Default language
                <select name="defaultLanguage" defaultValue={settings.defaultLanguage}>
                  <option value="English">English</option>
                  <option value="Arabic">Arabic</option>
                </select>
              </label>
              <label>
                Retention
                <select name="defaultRetention" defaultValue={settings.defaultRetention}>
                  <option value="7 years">7 years</option>
                  <option value="10 years">10 years</option>
                  <option value="Permanent">Permanent</option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  name="requireWorkflowOnSubmit"
                  defaultChecked={settings.requireWorkflowOnSubmit}
                />{' '}
                Require workflow on submit
              </label>
              <label>
                <input
                  type="checkbox"
                  name="notifyOnDocumentEvents"
                  defaultChecked={settings.notifyOnDocumentEvents}
                />{' '}
                Notify on document events
              </label>
              <button className="primary-button" disabled={saving}>
                {saving ? 'Saving…' : 'Save settings'}
              </button>
            </form>
          )}
        </article>
        <article className="panel">
          <p className="kicker">DIRECTORY</p>
          <h2>Administrators and users</h2>
          <ul className="health-list">
            {users.map((user) => (
              <li key={user.id}>
                <Users />
                <span>
                  <strong>{user.name}</strong>
                  <small>{user.role}</small>
                </span>
                <i />
              </li>
            ))}
          </ul>
        </article>
      </section>
      )}
      <p className="data-freshness">
        Metrics generated{' '}
        {overview
          ? new Intl.DateTimeFormat('en-AE', { dateStyle: 'medium', timeStyle: 'short' }).format(
              new Date(overview.generatedAt),
            )
          : '—'}
      </p>
    </div>
  )
}
function AdminTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button role="tab" aria-selected={active} className={active ? 'active' : ''} onClick={onClick}>
      {icon} {label}
    </button>
  )
}
function AdminMetric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <article className="metric-card">
      <span className="metric-icon gold">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{new Intl.NumberFormat('en-AE').format(value)}</strong>
      </div>
    </article>
  )
}
function InviteUserModal({
  busy,
  error,
  onClose,
  onSubmit,
}: {
  busy: boolean
  error: string
  onClose: () => void
  onSubmit: (input: { name: string; email: string; role: string }) => Promise<void>
}) {
  const dialogRef = useDialogFocus(onClose)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const name = (form.elements.namedItem('inviteName') as HTMLInputElement).value.trim()
    const email = (form.elements.namedItem('inviteEmail') as HTMLInputElement).value.trim()
    const role = (form.elements.namedItem('inviteRole') as HTMLSelectElement).value
    void onSubmit({ name, email, role })
  }
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}
    >
      <section
        ref={dialogRef}
        className="invite-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-user-title"
      >
        <header className="modal-header">
          <div>
            <p className="kicker">DIRECTORY</p>
            <h2 id="invite-user-title">
              <UserPlus size={20} /> Invite a user
            </h2>
          </div>
          <button className="close-button" onClick={onClose} disabled={busy} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="modal-body">
            <label className="form-field">
              <span>Full name</span>
              <input name="inviteName" required maxLength={120} autoComplete="name" />
            </label>
            <label className="form-field">
              <span>Work email</span>
              <input name="inviteEmail" type="email" required maxLength={200} autoComplete="email" />
            </label>
            <label className="form-field">
              <span>Role</span>
              <select name="inviteRole" defaultValue="viewer">
                {assignableRoles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role] || role}
                  </option>
                ))}
              </select>
            </label>
            {error && (
              <p className="form-message" role="alert">
                {error}
              </p>
            )}
          </div>
          <footer className="modal-footer">
            <span>New users start in the invited status.</span>
            <div>
              <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="gold-button" disabled={busy}>
                {busy ? 'Sending invite…' : 'Send invite'}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  )
}
