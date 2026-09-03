import { Bell, Check, FileCheck2, ShieldAlert, Workflow } from 'lucide-react'
import type { ActivityItem, WorkflowTask } from '../../types'

export function NotificationsPage({
  tasks,
  activity,
  onOpenWorkflows,
}: {
  tasks: WorkflowTask[]
  activity: ActivityItem[]
  onOpenWorkflows: () => void
}) {
  const pending = tasks.filter((task) => task.status === 'Pending')
  return (
    <div className="page-content notifications-page">
      <section className="page-heading">
        <div>
          <p className="kicker">MY WORKSPACE</p>
          <h1>Notification Center</h1>
          <p>Workflow assignments, document changes and governance alerts.</p>
        </div>
        <button className="secondary-button">
          <Check size={16} /> Mark all read
        </button>
      </section>
      <div className="notification-layout">
        <section className="panel notification-feed">
          <div className="panel-heading">
            <div>
              <p className="kicker">ACTION REQUIRED</p>
              <h2>Workflow notifications</h2>
            </div>
            <Bell size={19} />
          </div>
          {pending.map((task) => (
            <button className="notification-row" onClick={onOpenWorkflows} key={task.id}>
              <span
                className={task.priority === 'Critical' ? 'notification-icon danger' : 'notification-icon'}
              >
                {task.priority === 'Critical' ? <ShieldAlert size={19} /> : <Workflow size={19} />}
              </span>
              <span>
                <strong>
                  {task.stage}: {task.documentTitle}
                </strong>
                <small>
                  {task.documentNumber} · Due {formatDate(task.dueDate)}
                </small>
              </span>
              <i />
            </button>
          ))}
        </section>
        <section className="panel notification-feed">
          <div className="panel-heading">
            <div>
              <p className="kicker">RECENT UPDATES</p>
              <h2>Document activity</h2>
            </div>
            <FileCheck2 size={19} />
          </div>
          {activity.map((item) => (
            <div className="notification-row static" key={item.id}>
              <span className={`notification-icon ${item.tone}`}>
                <FileCheck2 size={18} />
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>
                  {item.detail} · {item.time}
                </small>
              </span>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${value}T00:00:00`),
  )
}
