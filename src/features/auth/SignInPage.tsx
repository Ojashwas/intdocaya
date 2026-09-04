import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import type { UserProfile } from '../../types'

type Props = {
  onSignIn: (user: UserProfile) => void
}

const demoUser: UserProfile = {
  name: 'Khalid Al Mansoori',
  email: 'k.mansoori@docaya.local',
  initials: 'KM',
  role: 'Quality & Records Manager',
  department: 'Records & Governance',
}

export function SignInPage({ onSignIn }: Props) {
  const [email, setEmail] = useState('k.mansoori@docaya.local')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const completeDemoSignIn = () => {
    setBusy(true)
    window.setTimeout(() => onSignIn({ ...demoUser, email }), 450)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!email.trim() || !email.includes('@')) return setError('Enter a valid organizational email address.')
    if (password.length < 6) return setError('Password must contain at least 6 characters.')
    completeDemoSignIn()
  }

  return (
    <main className="signin-layout">
      <section className="signin-story" aria-label="Docaya introduction">
        <div className="story-orbit story-orbit-top" />
        <div className="story-orbit story-orbit-bottom" />
        <div className="signin-brand">
          <span className="brand-monogram">D</span>
          <span>
            <strong>Docaya</strong>
            <small>DOCUMENT EXCELLENCE</small>
          </span>
        </div>
        <div className="story-copy">
          <p className="kicker light">CONTROLLED DOCUMENTS · UAE</p>
          <h1>
            Every document.
            <br />
            <span>One trusted home.</span>
          </h1>
          <p>Governed records, clear approvals and complete traceability across every organizational sector.</p>
        </div>
        <div className="story-assurance">
          <p>
            Secure document control, lifecycle governance and workflow intelligence—designed for public
            service.
          </p>
          <div>
            <span>
              <LockKeyhole size={14} /> ISO 27001 aligned
            </span>
            <span>
              <ShieldCheck size={14} /> UAE hosted
            </span>
            <span>
              <CheckCircle2 size={14} /> WCAG 2.2 AA
            </span>
          </div>
        </div>
      </section>

      <section className="signin-panel">
        <form className="signin-card" onSubmit={submit} noValidate>
          <div className="workspace-lockup" aria-label="Secure document workspace">
            <span className="workspace-seal">
              <ShieldCheck size={28} />
            </span>
            <span>
              مساحة الوثائق الآمنة<small>SECURE DOCUMENT WORKSPACE</small>
            </span>
          </div>
          <p className="kicker">SECURE WORKSPACE ACCESS</p>
          <h2>Sign in to continue</h2>
          <p className="signin-subtitle">Use your organizational credentials or single sign-on.</p>

          <label className="field-label" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            className="text-input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label className="field-label" htmlFor="password">
            Password
          </label>
          <div className="password-field">
            <input
              id="password"
              className="text-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="signin-options">
            <label>
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />{' '}
              Remember me
            </label>
            <button
              type="button"
              onClick={() => setError('Password reset is managed through the organizational identity portal.')}
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <p className="form-message" role="alert">
              {error}
            </p>
          )}

          <button className="gold-button wide" type="submit" disabled={busy}>
            {busy ? (
              'Signing in…'
            ) : (
              <>
                Sign in <ArrowRight size={17} />
              </>
            )}
          </button>
          <div className="signin-divider">
            <span>or</span>
          </div>
          <button className="sso-button" type="button" disabled={busy} onClick={completeDemoSignIn}>
            <span className="sso-mark">S</span> Continue with organizational SSO
          </button>
          <button className="uaepass-button" type="button" disabled={busy} onClick={completeDemoSignIn}>
            <span>UAE</span> Sign in with UAE PASS
          </button>

          <p className="demo-notice">
            Prototype access · Data shown is illustrative · Do not use a real password
          </p>
        </form>
      </section>
    </main>
  )
}
