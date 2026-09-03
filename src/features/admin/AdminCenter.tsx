import {
  Activity,
  Database,
  FileCheck2,
  HardDrive,
  Search,
  ServerCog,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import type { AdminUser, TenantSettings } from '../../services/api'

type Overview = {
  users: number
  documents: number
  trashedDocuments: number
  pendingWorkflows: number
  generatedAt: string
}

export function AdminCenter({
  overview,
  settings,
  users,
  onSaveSettings,
}: {
  overview: Overview | null
  settings: TenantSettings | null
  users: AdminUser[]
  onSaveSettings: (changes: Partial<TenantSettings>) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState<'overview' | 'users' | 'settings'>('overview')
  const [userQuery, setUserQuery] = useState('')
  const [userStatus, setUserStatus] = useState('all')
  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const haystack = `${user.name || ''} ${user.email || ''} ${user.role || ''}`.toLowerCase()
        return haystack.includes(userQuery.toLowerCase()) && (userStatus === 'all' || user.status === userStatus)
      }),
    [users, userQuery, userStatus],
  )
  const activeUsers = users.filter((user) => user.status === 'active').length
  return (
    <div className="page-content admin-page">
      <section className="page-heading">
        <div>
          <p className="kicker">TENANT CONTROL PLANE</p>
          <h1>Admin Center</h1>
          <p>Live governance, platform health and configuration for this tenant.</p>
        </div>
        <span className="health-pill">
          <i /> All local services healthy
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
                <small>Operational</small>
              </span>
              <i />
            </li>
            <li>
              <Database />
              <span>
                <strong>Authoritative metadata store</strong>
                <small>Connected</small>
              </span>
              <i />
            </li>
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
          </select>
        </div>
        <div className="admin-user-table" role="table" aria-label="Tenant users">
          <div className="admin-user-row admin-user-head" role="row">
            <span>Name</span><span>Role</span><span>Status</span><span>Created</span>
          </div>
          {filteredUsers.map((user, index) => (
            <div className="admin-user-row" role="row" key={user.id || user.email || index}>
              <span><strong>{user.name || 'Workspace user'}</strong><small>{user.email || 'No email recorded'}</small></span>
              <span>{user.role || 'Member'}</span>
              <span><b className={`status-badge ${(user.status || 'unknown').toLowerCase()}`}>{user.status || 'Unknown'}</b></span>
              <span>{new Intl.DateTimeFormat('en-AE', { dateStyle: 'medium' }).format(new Date(user.created_at))}</span>
            </div>
          ))}
          {!filteredUsers.length && <p className="empty-copy">No users match the selected filters.</p>}
        </div>
      </section>
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
