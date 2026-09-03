import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileClock,
  Files,
  FolderPlus,
  ShieldAlert,
  Sparkles,
  Workflow,
} from 'lucide-react'
import type { ActivityItem, ControlledDocument, UserProfile, WorkflowTask } from '../../types'

type Props = {
  user: UserProfile
  documents: ControlledDocument[]
  tasks: WorkflowTask[]
  activity: ActivityItem[]
  onOpenDocuments: () => void
  onOpenWorkflows: () => void
  onRegister: () => void
}

export function HomePage({
  user,
  documents,
  tasks,
  activity,
  onOpenDocuments,
  onOpenWorkflows,
  onRegister,
}: Props) {
  const pending = tasks.filter((task) => task.status === 'Pending')
  const published = documents.filter((doc) => doc.status === 'Published').length
  const restricted = documents.filter((doc) => doc.classification === 'Restricted').length
  const reviewCutoff = new Date()
  reviewCutoff.setUTCDate(reviewCutoff.getUTCDate() + 30)
  const dueReviews = documents.filter(
    (doc) => new Date(`${doc.nextReview}T00:00:00Z`) <= reviewCutoff && doc.status !== 'Superseded',
  ).length
  const firstName = user.name.split(' ')[0]
  const governance = documents.length
    ? Math.round(
        (documents.filter((doc) => doc.owner && doc.classification && doc.nextReview).length /
          documents.length) *
          1000,
      ) / 10
    : 0
  const today = new Intl.DateTimeFormat('en-AE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(new Date())
    .toUpperCase()

  return (
    <div className="page-content home-page">
      <section className="page-heading">
        <div>
          <p className="kicker">{today}</p>
          <h1>Welcome, {firstName}</h1>
          <p>Here is your document governance overview.</p>
        </div>
        <button className="gold-button" onClick={onRegister}>
          <FolderPlus size={17} /> Register document
        </button>
      </section>

      <section className="metric-grid" aria-label="Document governance metrics">
        <Metric
          icon={<Files />}
          label="Controlled documents"
          value={String(documents.length)}
          detail={`${published} published`}
          tone="gold"
        />
        <Metric
          icon={<Workflow />}
          label="My pending tasks"
          value={String(pending.length)}
          detail="Requires your action"
          tone="blue"
        />
        <Metric
          icon={<CalendarClock />}
          label="Reviews due"
          value={String(dueReviews)}
          detail="Within 30 days"
          tone="amber"
        />
        <Metric
          icon={<ShieldAlert />}
          label="Restricted records"
          value={String(restricted)}
          detail="Access controlled"
          tone="red"
        />
      </section>

      <section className="home-layout">
        <article className="governance-hero">
          <div className="hero-orbit" />
          <p className="kicker light">DOCUMENT GOVERNANCE INDEX</p>
          <h2>
            {governance.toFixed(1)} <span>/ 100</span>
          </h2>
          <p>
            Weighted across metadata completeness, approval compliance, review currency and records
            classification.
          </p>
          <div className="hero-stats">
            <span>
              <small>METADATA QUALITY</small>
              <strong>{governance}%</strong>
            </span>
            <span>
              <small>PUBLISHED</small>
              <strong>{documents.length ? Math.round((published / documents.length) * 100) : 0}%</strong>
            </span>
            <span>
              <small>ACTIVE SECTORS</small>
              <strong>{new Set(documents.map((doc) => doc.department)).size}</strong>
            </span>
          </div>
          <button onClick={onOpenDocuments}>
            Open governance analytics <ArrowRight size={16} />
          </button>
        </article>

        <article className="panel my-work-panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">MY WORK QUEUE</p>
              <h2>Actions required</h2>
            </div>
            <button onClick={onOpenWorkflows}>View all</button>
          </div>
          <div className="task-list compact">
            {pending.slice(0, 3).map((task) => (
              <button key={task.id} onClick={onOpenWorkflows} className="task-row">
                <span className={`priority-mark ${task.priority.toLowerCase()}`}>
                  <FileClock size={17} />
                </span>
                <span>
                  <strong>{task.documentTitle}</strong>
                  <small>
                    {task.stage} · Due {formatDate(task.dueDate)}
                  </small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </article>

        <article className="panel trend-panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">LAST 8 MONTHS</p>
              <h2>Controlled document compliance</h2>
            </div>
            <span className="positive-label">▲ 6.2% YTD</span>
          </div>
          <div className="bar-chart" aria-label="Compliance trend from January to August">
            {[76, 80, 83, 86, 88, 91, 94, 96].map((value, index) => (
              <div key={value}>
                <span style={{ height: `${value}%` }} title={`${value}%`} />
                <small>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][index]}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <p className="kicker">WORKSPACE-WIDE</p>
              <h2>Recent activity</h2>
            </div>
            <Sparkles size={19} />
          </div>
          <div className="activity-list">
            {activity.map((item) => (
              <div className="activity-item" key={item.id}>
                <i className={item.tone} />
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.detail} · {item.time}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
  tone: string
}) {
  return (
    <article className="metric-card">
      <span className={`metric-icon ${tone}`}>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>
          <CheckCircle2 size={12} /> {detail}
        </p>
      </div>
    </article>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AE', { day: 'numeric', month: 'short' }).format(
    new Date(`${value}T00:00:00`),
  )
}
