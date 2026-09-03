import {
  Bell,
  Bot,
  ChevronDown,
  CircleHelp,
  FolderKanban,
  Home,
  Languages,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Workflow,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { t } from '../i18n/locales'
import type { AppPage, Locale, UserProfile } from '../types'

type Props = {
  user: UserProfile
  page: AppPage
  notificationCount: number
  onNavigate: (page: AppPage) => void
  onSignOut: () => void
  locale: Locale
  onLocaleChange: (locale: Locale) => void
  onSearch: (query: string) => void
  children: ReactNode
}

const navigation: { label: string; page: AppPage; icon: typeof Home; group: string }[] = [
  { label: 'Home', page: 'home', icon: Home, group: 'OVERVIEW' },
  { label: 'Document Center', page: 'documents', icon: FolderKanban, group: 'RECORDS & GOVERNANCE' },
  { label: 'My Workflows', page: 'workflows', icon: Workflow, group: 'RECORDS & GOVERNANCE' },
  { label: 'Notifications', page: 'notifications', icon: Bell, group: 'MY WORKSPACE' },
  { label: 'Admin Center', page: 'admin', icon: Settings, group: 'ADMINISTRATION' },
]

export function AppShell({
  user,
  page,
  notificationCount,
  onNavigate,
  onSignOut,
  locale,
  onLocaleChange,
  onSearch,
  children,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const pageLabel = navigation.find((item) => item.page === page)?.label || 'Docaya'

  const navigate = (next: AppPage) => {
    onNavigate(next)
    setMobileOpen(false)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => onSearch(query), 300)
    return () => window.clearTimeout(timer)
  }, [onSearch, query])

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (
        event.key === '/' &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])

  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#main-content">
        {t(locale, 'skip')}
      </a>
      <aside
        className={mobileOpen ? 'workspace-sidebar open' : 'workspace-sidebar'}
        aria-label="Primary navigation"
      >
        <div className="shell-brand">
          <span className="brand-monogram small">D</span>
          <span>
            <strong>Docaya</strong>
            <small>DOCUMENT EXCELLENCE</small>
          </span>
          <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>
        <div className="sidebar-workspace">
          <ShieldCheck size={18} />
          <span>
            مساحة الوثائق<small>SECURE DOCUMENT WORKSPACE</small>
          </span>
        </div>
        <nav>
          {['OVERVIEW', 'RECORDS & GOVERNANCE', 'MY WORKSPACE', 'ADMINISTRATION'].map((group) => (
            <div className="nav-section" key={group}>
              <p>{group}</p>
              {navigation
                .filter((item) => item.group === group)
                .map(({ label, page: target, icon: Icon }) => (
                  <button
                    className={page === target ? 'side-nav active' : 'side-nav'}
                    key={target}
                    onClick={() => navigate(target)}
                    aria-current={page === target ? 'page' : undefined}
                  >
                    <Icon size={18} /> <span>{label}</span>
                    {target === 'workflows' && notificationCount > 0 && <b>{notificationCount}</b>}
                  </button>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="side-nav">
            <CircleHelp size={18} />
            <span>Help Center</span>
          </button>
          <button className="side-nav">
            <Settings size={18} />
            <span>Settings</span>
          </button>
          <div className="security-note">
            <ShieldCheck size={17} />
            <span>
              Protected document workspace<small>Session activity is audited</small>
            </span>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="topbar-title">
            <button className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu size={21} />
            </button>
            <strong>{pageLabel}</strong>
          </div>
          <form
            className="global-search"
            onSubmit={(event) => {
              event.preventDefault()
              onSearch(query)
            }}
          >
            <Search size={17} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search documents and workflows"
              placeholder={t(locale, 'search')}
            />
            <kbd>Ctrl K</kbd>
          </form>
          <div className="topbar-actions">
            <button className="square-button ai-button" aria-label="Ask Docaya">
              <Bot size={19} />
            </button>
            <button
              className="square-button"
              onClick={() => navigate('notifications')}
              aria-label={`${notificationCount} notifications`}
            >
              <Bell size={18} />
              {notificationCount > 0 && <i />}
            </button>
            <button className="language-button" onClick={() => onLocaleChange(locale === 'en' ? 'ar' : 'en')}>
              <Languages size={16} /> {t(locale, 'language')}
            </button>
            <div className="profile-menu">
              <button
                className="profile-trigger"
                onClick={() => setProfileOpen((value) => !value)}
                aria-expanded={profileOpen}
              >
                <span className="user-avatar">{user.initials}</span>
                <span>
                  <strong>{user.name}</strong>
                  <small>{user.role}</small>
                </span>
                <ChevronDown size={15} />
              </button>
              {profileOpen && (
                <div className="profile-popover">
                  <div>
                    <UserRound size={17} />
                    <span>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </span>
                  </div>
                  <button onClick={onSignOut}>
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="main-content" className="page-surface" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}
