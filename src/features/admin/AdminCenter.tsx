import { Activity, Database, FileCheck2, HardDrive, ServerCog, ShieldCheck, Users } from 'lucide-react'
import { useState } from 'react'
import type { TenantSettings } from '../../services/api'

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
  users: Array<Record<string, unknown>>
  onSaveSettings: (changes: Partial<TenantSettings>) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
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
      {!overview ? (
        <div className="panel loading-panel" role="status">
          Loading trusted administration metrics…
        </div>
      ) : (
        <section className="metric-grid">
          <AdminMetric icon={<Users />} label="Active users" value={overview.users} />
          <AdminMetric icon={<FileCheck2 />} label="Controlled documents" value={overview.documents} />
          <AdminMetric icon={<Activity />} label="Pending workflows" value={overview.pendingWorkflows} />
          <AdminMetric icon={<Database />} label="Items in trash" value={overview.trashedDocuments} />
        </section>
      )}
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
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </label>
              <label>
                Retention
                <select name="defaultRetention" defaultValue={settings.defaultRetention}>
                  <option value="standard">Standard</option>
                  <option value="extended">Extended</option>
                  <option value="permanent">Permanent</option>
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
            {users.map((user, index) => (
              <li key={String(user.id ?? index)}>
                <Users />
                <span>
                  <strong>{String(user.displayName ?? user.email ?? 'Workspace user')}</strong>
                  <small>{String(user.role ?? 'Member')}</small>
                </span>
                <i />
              </li>
            ))}
          </ul>
        </article>
      </section>
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
function AdminMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
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
