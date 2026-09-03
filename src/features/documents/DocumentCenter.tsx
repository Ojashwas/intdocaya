import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  BarChart3,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FilePenLine,
  Files,
  FolderPlus,
  Inbox,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import type { ControlledDocument, WorkflowStatus, WorkflowTask } from '../../types'

type Tab = 'register' | 'workflow' | 'reviews' | 'analytics'

type Props = {
  documents: ControlledDocument[]
  tasks: WorkflowTask[]
  initialTab?: Tab
  onRegister: () => void
  onSelectDocument: (document: ControlledDocument) => void
  onTaskAction: (task: WorkflowTask, action: WorkflowStatus) => void
  onReviewComplete: (document: ControlledDocument) => void
}

const statuses = [
  'All',
  'Draft',
  'Under Review',
  'Under Approval',
  'Published',
  'Superseded',
  'Archived',
] as const

export function DocumentCenter({
  documents,
  tasks,
  initialTab = 'register',
  onRegister,
  onSelectDocument,
  onTaskAction,
  onReviewComplete,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [status, setStatus] = useState<(typeof statuses)[number]>('All')
  const [query, setQuery] = useState('')
  const pendingTasks = tasks.filter((task) => task.status === 'Pending')
  const reviewCutoff = new Date()
  reviewCutoff.setUTCMonth(reviewCutoff.getUTCMonth() + 3)
  const reviews = documents.filter(
    (doc) => doc.status === 'Published' && new Date(`${doc.nextReview}T00:00:00Z`) <= reviewCutoff,
  )

  const filtered = useMemo(
    () =>
      documents.filter((doc) => {
        const matchesStatus = status === 'All' || doc.status === status
        const haystack = `${doc.number} ${doc.title} ${doc.owner} ${doc.type} ${doc.department}`.toLowerCase()
        return matchesStatus && haystack.includes(query.toLowerCase())
      }),
    [documents, query, status],
  )

  return (
    <div className="page-content document-page">
      <section className="page-heading document-heading">
        <div>
          <p className="kicker">RECORDS GOVERNANCE</p>
          <h1>Document Center</h1>
          <p>Controlled lifecycle, revisions, approvals, periodic reviews and issue history.</p>
        </div>
        <button className="gold-button" onClick={onRegister}>
          <FolderPlus size={17} /> Register document
        </button>
      </section>

      <section className="metric-grid document-metrics">
        <DocMetric icon={<Files />} label="Controlled documents" value={documents.length} />
        <DocMetric
          icon={<CheckCircle2 />}
          label="Published"
          value={documents.filter((doc) => doc.status === 'Published').length}
          tone="green"
        />
        <DocMetric icon={<Inbox />} label="My tasks" value={pendingTasks.length} tone="blue" />
        <DocMetric icon={<CalendarCheck />} label="Reviews due" value={reviews.length} tone="amber" />
      </section>

      <div className="section-tabs" role="tablist" aria-label="Document Center views">
        <TabButton
          active={tab === 'register'}
          onClick={() => setTab('register')}
          icon={<FilePenLine size={16} />}
          label="Register"
        />
        <TabButton
          active={tab === 'workflow'}
          onClick={() => setTab('workflow')}
          icon={<Inbox size={16} />}
          label="My workflow"
          count={pendingTasks.length}
        />
        <TabButton
          active={tab === 'reviews'}
          onClick={() => setTab('reviews')}
          icon={<CalendarCheck size={16} />}
          label="Periodic review"
        />
        <TabButton
          active={tab === 'analytics'}
          onClick={() => setTab('analytics')}
          icon={<BarChart3 size={16} />}
          label="Analytics"
        />
      </div>

      {tab === 'register' && (
        <Repository
          documents={filtered}
          allDocuments={documents}
          query={query}
          status={status}
          onQuery={setQuery}
          onStatus={setStatus}
          onSelect={onSelectDocument}
        />
      )}
      {tab === 'workflow' && <WorkflowInbox tasks={tasks} onAction={onTaskAction} />}
      {tab === 'reviews' && (
        <PeriodicReviews documents={reviews} onSelect={onSelectDocument} onComplete={onReviewComplete} />
      )}
      {tab === 'analytics' && <DocumentAnalytics documents={documents} />}
    </div>
  )
}

function Repository({
  documents,
  allDocuments,
  query,
  status,
  onQuery,
  onStatus,
  onSelect,
}: {
  documents: ControlledDocument[]
  allDocuments: ControlledDocument[]
  query: string
  status: (typeof statuses)[number]
  onQuery: (value: string) => void
  onStatus: (value: (typeof statuses)[number]) => void
  onSelect: (doc: ControlledDocument) => void
}) {
  return (
    <section className="repository-section">
      <div className="repository-heading">
        <div>
          <h2>Controlled repository</h2>
          <p>Metadata-driven libraries—select a record to open its full workflow.</p>
        </div>
        <label className="repository-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Filter by number, title, owner or type"
          />
        </label>
      </div>
      <div className="filter-chips" aria-label="Filter documents by status">
        {statuses.map((item) => (
          <button className={status === item ? 'active' : ''} onClick={() => onStatus(item)} key={item}>
            {statusIcon(item)} {item}{' '}
            <span>
              {item === 'All'
                ? allDocuments.length
                : allDocuments.filter((doc) => doc.status === item).length}
            </span>
          </button>
        ))}
      </div>
      <div className="table-card">
        <div className="table-title">
          <p className="kicker">CONTROLLED DOCUMENTS</p>
          <h3>Document register</h3>
        </div>
        <div className="table-scroll">
          <table className="document-table">
            <thead>
              <tr>
                <th>Document no.</th>
                <th>Title</th>
                <th>Type</th>
                <th>Rev</th>
                <th>Owner</th>
                <th>Classification</th>
                <th>Next review</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <button className="table-link" onClick={() => onSelect(doc)}>
                      {doc.number}
                    </button>
                  </td>
                  <td>
                    <button className="title-link" onClick={() => onSelect(doc)}>
                      {doc.title}
                    </button>
                  </td>
                  <td>{doc.type}</td>
                  <td>
                    <span className="revision">Rev {String(doc.revision).padStart(2, '0')}</span>
                  </td>
                  <td>{doc.owner}</td>
                  <td>
                    <span className={`classification ${doc.classification.toLowerCase()}`}>
                      {doc.classification}
                    </span>
                  </td>
                  <td>{formatDate(doc.nextReview)}</td>
                  <td>
                    <span className={`status ${statusClass(doc.status)}`}>{doc.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {documents.length === 0 && (
          <div className="empty-state">
            <Files size={30} />
            <h3>No matching documents</h3>
            <p>Change the status filter or search phrase.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function WorkflowInbox({
  tasks,
  onAction,
}: {
  tasks: WorkflowTask[]
  onAction: (task: WorkflowTask, action: WorkflowStatus) => void
}) {
  const [filter, setFilter] = useState<'Pending' | 'Completed'>('Pending')
  const shown = tasks.filter((task) =>
    filter === 'Pending' ? task.status === 'Pending' : task.status !== 'Pending',
  )
  return (
    <section className="workflow-section">
      <div className="section-heading-row">
        <div>
          <h2>My workflow inbox</h2>
          <p>Review assigned documents and record an auditable decision.</p>
        </div>
        <div className="segmented">
          <button className={filter === 'Pending' ? 'active' : ''} onClick={() => setFilter('Pending')}>
            Pending
          </button>
          <button className={filter === 'Completed' ? 'active' : ''} onClick={() => setFilter('Completed')}>
            Completed
          </button>
        </div>
      </div>
      <div className="workflow-list">
        {shown.map((task) => (
          <article className="workflow-card" key={task.id}>
            <div className="workflow-card-main">
              <span className={`priority-mark ${task.priority.toLowerCase()}`}>
                <FileCheck2 size={21} />
              </span>
              <div>
                <div className="workflow-meta">
                  <span className={`priority-label ${task.priority.toLowerCase()}`}>{task.priority}</span>
                  <span>{task.stage}</span>
                </div>
                <h3>{task.documentTitle}</h3>
                <p>
                  {task.documentNumber} · Requested by {task.requestedBy}
                </p>
              </div>
            </div>
            <div className="workflow-due">
              <Clock3 size={15} />
              <span>
                Due<strong>{formatDate(task.dueDate)}</strong>
              </span>
            </div>
            {task.status === 'Pending' ? (
              <div className="workflow-actions">
                <button className="request-button" onClick={() => onAction(task, 'Changes requested')}>
                  <RefreshCw size={15} /> Request changes
                </button>
                <button className="reject-button" onClick={() => onAction(task, 'Rejected')}>
                  <XCircle size={15} /> Reject
                </button>
                <button className="approve-button" onClick={() => onAction(task, 'Approved')}>
                  <Check size={16} /> Approve
                </button>
              </div>
            ) : (
              <span className={`decision ${task.status.toLowerCase().replace(' ', '-')}`}>{task.status}</span>
            )}
          </article>
        ))}
      </div>
      {shown.length === 0 && (
        <div className="empty-state panel">
          <CheckCircle2 size={32} />
          <h3>Your queue is clear</h3>
          <p>No workflow items in this view.</p>
        </div>
      )}
    </section>
  )
}

function PeriodicReviews({
  documents,
  onSelect,
  onComplete,
}: {
  documents: ControlledDocument[]
  onSelect: (doc: ControlledDocument) => void
  onComplete: (doc: ControlledDocument) => void
}) {
  return (
    <section className="workflow-section">
      <div className="section-heading-row">
        <div>
          <h2>Periodic document reviews</h2>
          <p>Confirm that issued documents remain accurate, necessary and correctly classified.</p>
        </div>
      </div>
      <div className="review-grid">
        {documents.map((doc) => (
          <article className="review-card" key={doc.id}>
            <div className="review-date">
              <CalendarCheck size={20} />
              <span>
                <small>NEXT REVIEW</small>
                <strong>{formatDate(doc.nextReview)}</strong>
              </span>
            </div>
            <h3>{doc.title}</h3>
            <p>
              {doc.number} · Rev {doc.revision}
            </p>
            <div>
              <span className={`classification ${doc.classification.toLowerCase()}`}>
                {doc.classification}
              </span>
              <span>{doc.department}</span>
            </div>
            <footer>
              <button onClick={() => onSelect(doc)}>Open record</button>
              <button className="approve-button" onClick={() => onComplete(doc)}>
                <Check size={15} /> Confirm current
              </button>
            </footer>
          </article>
        ))}
      </div>
    </section>
  )
}

function DocumentAnalytics({ documents }: { documents: ControlledDocument[] }) {
  const byStatus = statuses
    .slice(1)
    .map((item) => ({ label: item, count: documents.filter((doc) => doc.status === item).length }))
  const maximum = Math.max(...byStatus.map((item) => item.count), 1)
  const completeness = documents.length
    ? Math.round(
        (documents.filter((doc) => doc.owner && doc.classification && doc.nextReview).length /
          documents.length) *
          100,
      )
    : 0
  const classificationCoverage = documents.length
    ? Math.round((documents.filter((doc) => doc.classification).length / documents.length) * 100)
    : 0
  return (
    <section className="analytics-section">
      <div className="section-heading-row">
        <div>
          <h2>Document governance analytics</h2>
          <p>Current controlled-record distribution and compliance signals.</p>
        </div>
      </div>
      <div className="analytics-grid">
        <article className="panel status-chart">
          <p className="kicker">LIFECYCLE DISTRIBUTION</p>
          <h3>Documents by status</h3>
          <div>
            {byStatus.map((item) => (
              <div className="horizontal-bar" key={item.label}>
                <span>{item.label}</span>
                <i>
                  <b style={{ width: `${(item.count / maximum) * 100}%` }} />
                </i>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="panel analytics-summary">
          <p className="kicker">CONTROL EFFECTIVENESS</p>
          <h3>Quality indicators</h3>
          <dl>
            <div>
              <dt>Metadata complete</dt>
              <dd>{completeness}%</dd>
            </div>
            <div>
              <dt>Published</dt>
              <dd>
                {documents.length
                  ? Math.round(
                      (documents.filter((doc) => doc.status === 'Published').length / documents.length) * 100,
                    )
                  : 0}
                %
              </dd>
            </div>
            <div>
              <dt>Assigned owners</dt>
              <dd>
                {documents.length
                  ? Math.round((documents.filter((doc) => doc.owner).length / documents.length) * 100)
                  : 0}
                %
              </dd>
            </div>
            <div>
              <dt>Classification coverage</dt>
              <dd>{classificationCoverage}%</dd>
            </div>
          </dl>
          <p>
            <ShieldCheck size={17} /> Indicators are calculated from the current authorized API result.
          </p>
        </article>
      </div>
    </section>
  )
}

function DocMetric({
  icon,
  label,
  value,
  tone = 'gold',
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone?: string
}) {
  return (
    <article className="metric-card">
      <span className={`metric-icon ${tone}`}>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  )
}
function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
}) {
  return (
    <button role="tab" aria-selected={active} className={active ? 'active' : ''} onClick={onClick}>
      {icon}
      {label}
      {count ? <b>{count}</b> : null}
    </button>
  )
}
function statusIcon(status: string) {
  if (status === 'Published') return <CheckCircle2 size={14} />
  if (status === 'Archived') return <Archive size={14} />
  if (status.includes('Review') || status.includes('Approval')) return <Clock3 size={14} />
  if (status === 'Draft') return <FilePenLine size={14} />
  if (status === 'Superseded') return <AlertTriangle size={14} />
  return <Files size={14} />
}
function statusClass(status: string) {
  return status.toLowerCase().replaceAll(' ', '-')
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${value}T00:00:00`),
  )
}
