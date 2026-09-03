import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppShell } from './components/AppShell'
import { AdminCenter } from './features/admin/AdminCenter'
import { SignInPage } from './features/auth/SignInPage'
import { DocumentCenter } from './features/documents/DocumentCenter'
import { DocumentDetailModal } from './features/documents/DocumentDetailModal'
import { RegisterDocumentModal } from './features/documents/RegisterDocumentModal'
import { HomePage } from './features/home/HomePage'
import { NotificationCenter, type NotificationItem } from './features/notifications/NotificationCenter'
import {
  decideWorkflow,
  developmentSignIn,
  getAdminSettings,
  getOverview,
  listAdminUsers,
  listDocuments,
  listNotifications,
  listWorkflows,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  registerDocument,
  restoreSession,
  searchDocuments,
  signOut,
  updateDocument,
  updateAdminSettings,
} from './services/api'
import type {
  ActivityItem,
  AppPage,
  ControlledDocument,
  Locale,
  RegistrationInput,
  UserProfile,
  WorkflowStatus,
  WorkflowTask,
} from './types'

type Overview = {
  users: number
  documents: number
  trashedDocuments: number
  pendingWorkflows: number
  generatedAt: string
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [page, setPage] = useState<AppPage>('home')
  const [documents, setDocuments] = useState<ControlledDocument[]>([])
  const [allDocuments, setAllDocuments] = useState<ControlledDocument[]>([])
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [overview, setOverview] = useState<Overview | null>(null)
  const [adminSettings, setAdminSettings] = useState<Awaited<ReturnType<typeof getAdminSettings>> | null>(
    null,
  )
  const [adminUsers, setAdminUsers] = useState<Array<Record<string, unknown>>>([])
  const [selected, setSelected] = useState<ControlledDocument | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [locale, setLocale] = useState<Locale>(
    () => (localStorage.getItem('docaya_locale') as Locale) || 'en',
  )
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const searchController = useRef<AbortController | null>(null)

  const loadWorkspace = useCallback(async () => {
    setError('')
    try {
      const [docs, workflowRows, notificationRows, adminOverview] = await Promise.all([
        listDocuments(),
        listWorkflows(),
        listNotifications(),
        getOverview(),
      ])
      setDocuments(docs)
      setAllDocuments(docs)
      setTasks(workflowRows)
      setNotifications(notificationRows)
      setOverview(adminOverview)
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Docaya could not load the workspace.')
    }
  }, [])

  useEffect(() => {
    restoreSession().then((session) => {
      setUser(session)
      setLoading(false)
      if (session) void loadWorkspace()
    })
  }, [loadWorkspace])
  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    localStorage.setItem('docaya_locale', locale)
  }, [locale])

  const authenticate = async () => {
    setError('')
    try {
      const profile = await developmentSignIn()
      setUser(profile)
      await loadWorkspace()
    } catch (problem) {
      setError(
        problem instanceof Error
          ? `${problem.message} Start the API with npm run dev:api for local development.`
          : 'Sign-in failed.',
      )
    }
  }

  const navigate = (next: AppPage) => {
    setPage(next)
    setMessage('')
    if (next === 'admin') void refreshOverview()
  }
  const refreshOverview = async () => {
    try {
      const [nextOverview, settings, users] = await Promise.all([
        getOverview(),
        getAdminSettings(),
        listAdminUsers(),
      ])
      setOverview(nextOverview)
      setAdminSettings(settings)
      setAdminUsers(users)
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Admin metrics could not be loaded.')
    }
  }
  const handleSignOut = () => {
    signOut()
    setUser(null)
    setDocuments([])
    setTasks([])
    setNotifications([])
    setPage('home')
  }
  const handleRegister = async (input: RegistrationInput, submit: boolean) => {
    try {
      const document = await registerDocument(input, submit)
      setAllDocuments((rows) => [document, ...rows])
      setDocuments((rows) => [document, ...rows])
      setRegisterOpen(false)
      setMessage(submit ? 'Document registered and submitted for review.' : 'Draft document registered.')
      await refreshOverview()
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Document registration failed.')
    }
  }
  const handleTask = async (task: WorkflowTask, action: WorkflowStatus) => {
    try {
      const changed = await decideWorkflow(task.id, action)
      setTasks((rows) => rows.map((row) => (row.id === changed.id ? changed : row)))
      setMessage(`${task.documentTitle}: ${action}.`)
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The workflow decision failed.')
    }
  }
  const handleReview = async (document: ControlledDocument) => {
    const next = new Date()
    next.setUTCFullYear(next.getUTCFullYear() + 1)
    try {
      const changed = await updateDocument(document.id, { nextReview: next.toISOString().slice(0, 10) })
      setDocuments((rows) => rows.map((row) => (row.id === changed.id ? changed : row)))
      setAllDocuments((rows) => rows.map((row) => (row.id === changed.id ? changed : row)))
      setMessage(`${document.title} confirmed current.`)
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The periodic review could not be saved.')
    }
  }
  const handleMarkAll = async () => {
    await markAllNotificationsRead()
    setNotifications((rows) =>
      rows.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })),
    )
  }
  const handleToggleNotification = async (id: string, read: boolean) => {
    if (read) await markNotificationRead(id)
    else await markNotificationUnread(id)
    setNotifications((rows) =>
      rows.map((item) =>
        item.id === id ? { ...item, readAt: read ? new Date().toISOString() : null } : item,
      ),
    )
  }
  const handleAdminSettings = async (changes: Parameters<typeof updateAdminSettings>[0]) => {
    setAdminSettings(await updateAdminSettings(changes))
    setMessage('Administration settings saved.')
  }
  const handleSearch = useCallback(
    async (query: string) => {
      searchController.current?.abort()
      if (!query.trim()) {
        setDocuments(allDocuments)
        return
      }
      const controller = new AbortController()
      searchController.current = controller
      try {
        const results = await searchDocuments(query.trim(), controller.signal)
        setDocuments(results)
        setPage('documents')
      } catch (problem) {
        if (problem instanceof DOMException && problem.name === 'AbortError') return
        setError(problem instanceof Error ? problem.message : 'Search failed.')
      }
    },
    [allDocuments],
  )

  const activity = useMemo<ActivityItem[]>(
    () =>
      allDocuments.slice(0, 4).map((document, index) => ({
        id: `activity-${document.id}`,
        title: `${document.number} ${document.status.toLowerCase()}`,
        detail: document.department,
        time: new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-index, 'hour'),
        tone: (['gold', 'green', 'blue', 'red'] as const)[index % 4],
      })),
    [allDocuments],
  )
  const unread = notifications.filter((item) => !item.readAt).length

  if (loading)
    return (
      <main className="app-loading" role="status">
        Loading secure Docaya workspace…
      </main>
    )
  if (!user)
    return (
      <>
        <SignInPage
          onSignIn={() => {
            void authenticate()
          }}
        />
        {error && (
          <div className="global-error" role="alert">
            {error}
          </div>
        )}
      </>
    )

  return (
    <AppShell
      user={user}
      page={page}
      notificationCount={unread}
      onNavigate={navigate}
      onSignOut={handleSignOut}
      locale={locale}
      onLocaleChange={setLocale}
      onSearch={handleSearch}
    >
      <div className="sr-live" aria-live="polite">
        {message}
      </div>
      {error && (
        <div className="page-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError('')}>Dismiss</button>
        </div>
      )}
      {page === 'home' && (
        <HomePage
          user={user}
          documents={allDocuments}
          tasks={tasks}
          activity={activity}
          onOpenDocuments={() => navigate('documents')}
          onOpenWorkflows={() => navigate('workflows')}
          onRegister={() => setRegisterOpen(true)}
        />
      )}
      {(page === 'documents' || page === 'workflows') && (
        <DocumentCenter
          key={page}
          documents={documents}
          tasks={tasks}
          initialTab={page === 'workflows' ? 'workflow' : 'register'}
          onRegister={() => setRegisterOpen(true)}
          onSelectDocument={setSelected}
          onTaskAction={handleTask}
          onReviewComplete={handleReview}
        />
      )}
      {page === 'notifications' && (
        <NotificationCenter
          items={notifications}
          onMarkAllRead={handleMarkAll}
          onToggleRead={handleToggleNotification}
        />
      )}
      {page === 'admin' && (
        <AdminCenter
          overview={overview}
          settings={adminSettings}
          users={adminUsers}
          onSaveSettings={handleAdminSettings}
        />
      )}
      {registerOpen && (
        <RegisterDocumentModal
          user={user}
          onClose={() => setRegisterOpen(false)}
          onSave={(input, submit) => {
            void handleRegister(input, submit)
          }}
        />
      )}
      {selected && <DocumentDetailModal document={selected} onClose={() => setSelected(null)} />}
    </AppShell>
  )
}
