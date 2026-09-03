import { Bell, CheckCheck, MessageSquare, ShieldAlert, Workflow } from 'lucide-react'
import { useMemo, useState } from 'react'

export type NotificationItem = {
  id: string
  category: string
  title: string
  body: string
  priority: string
  readAt: string | null
  createdAt: string
}

export function NotificationCenter({
  items,
  onMarkAllRead,
}: {
  items: NotificationItem[]
  onMarkAllRead: () => Promise<void>
}) {
  const [tab, setTab] = useState('all')
  const [message, setMessage] = useState('')
  const visible = useMemo(() => items.filter((item) => tab === 'all' || item.category === tab), [items, tab])
  const grouped = useMemo(() => groupNotifications(visible), [visible])
  const mark = async () => {
    await onMarkAllRead()
    setMessage('All notifications marked as read.')
  }
  return (
    <div className="page-content notification-page">
      <section className="page-heading">
        <div>
          <p className="kicker">YOUR WORK PULSE</p>
          <h1>Notification Center</h1>
          <p>Approval, collaboration, security and system signals in one place.</p>
        </div>
        <button className="secondary-button" onClick={mark}>
          <CheckCheck size={17} /> Mark all read
        </button>
      </section>
      <div className="section-tabs" role="tablist" aria-label="Notification categories">
        {['all', 'workflow', 'collaboration', 'security', 'system'].map((value) => (
          <button
            role="tab"
            aria-selected={tab === value}
            className={tab === value ? 'active' : ''}
            onClick={() => setTab(value)}
            key={value}
          >
            {value === 'workflow' ? (
              <Workflow size={16} />
            ) : value === 'collaboration' ? (
              <MessageSquare size={16} />
            ) : value === 'security' ? (
              <ShieldAlert size={16} />
            ) : (
              <Bell size={16} />
            )}{' '}
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>
      <p className="sr-live" aria-live="polite">
        {message}
      </p>
      <section className="notification-list">
        {Object.entries(grouped).map(([label, rows]) => (
          <div key={label}>
            <h2>{label}</h2>
            {rows.map((item) => (
              <article className={item.readAt ? 'notification-row read' : 'notification-row'} key={item.id}>
                <span className={`notification-icon ${item.priority}`}>
                  <Bell size={18} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <time dateTime={item.createdAt}>
                    {new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
                      relativeDays(item.createdAt),
                      'day',
                    )}
                  </time>
                </div>
                {!item.readAt && <i aria-label="Unread" />}
              </article>
            ))}
          </div>
        ))}
      </section>
      {!visible.length && (
        <div className="empty-state panel">
          <Bell size={32} />
          <h2>No notifications here</h2>
          <p>New activity will appear in this view.</p>
        </div>
      )}
    </div>
  )
}

function groupNotifications(items: NotificationItem[]) {
  const groups: Record<string, NotificationItem[]> = {}
  for (const item of items) {
    const days = Math.abs(relativeDays(item.createdAt))
    const label = days === 0 ? 'Today' : days <= 7 ? 'This week' : 'Earlier'
    ;(groups[label] ??= []).push(item)
  }
  return groups
}
function relativeDays(value: string) {
  return Math.round((new Date(value).getTime() - Date.now()) / 86_400_000)
}
