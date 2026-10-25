import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/web-app-ox/auth/useAuth'

const INVALID_CODES = [
  'auth/invalid-credential',
  'auth/user-not-found',
  'auth/wrong-password',
  'auth/invalid-email',
]

const MSG_INVALID = 'Invalid email or password.'
const MSG_TOO_MANY = 'Too many attempts. Try again later.'
const MSG_SERVER = "Couldn't reach the server. Try again."

function errorCode(cause: unknown): string {
  if (typeof cause === 'object' && cause !== null && 'code' in cause && typeof cause.code === 'string') {
    return cause.code
  }
  return ''
}

function messageFor(cause: unknown): string {
  const code = errorCode(cause)
  if (INVALID_CODES.includes(code)) return MSG_INVALID
  if (code === 'auth/too-many-requests') return MSG_TOO_MANY
  return MSG_SERVER
}

export default function LoginAdminPage() {
  const { user, loading, isAdmin, signInWithEmail } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  if (!loading && user && isAdmin) return <Navigate to="/admin" replace />

  const checking = loading && !busy

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    let failure: string | null = null
    try {
      const ok = await signInWithEmail(email.trim(), password)
      if (ok) {
        void navigate('/admin', { replace: true })
        return
      }
      failure = MSG_INVALID
    } catch (cause) {
      failure = messageFor(cause)
    } finally {
      setBusy(false)
    }
    setError(failure)
    setPassword('')
    setShow(false)
    window.setTimeout(() => passwordRef.current?.focus(), 0)
  }

  return (
    <div className="login-page login-page--admin">
      <main className="card login-card">
        <div className="login-logo login-logo--admin" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="64" height="64">
            <rect width="64" height="64" rx="16" fill="#0f172a" />
            <path
              d="M32 16 L47 22 V34 C47 44 41 50 32 53 C23 50 17 44 17 34 V22 Z"
              fill="none"
              stroke="#fff"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path d="M25 34 L30 39 L39 29" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="login-badge">ADMIN</span>
        <h1 className="login-title login-title--admin">Admin sign in</h1>
        <p className="login-text">For the OX Game administrator only.</p>

        {error ? (
          <div className="alert login-alert" role="alert">
            <p className="alert__title">Sign-in failed</p>
            <p className="alert__text">{error}</p>
          </div>
        ) : null}

        {checking ? (
          <div className="state login-status" role="status">
            <span className="spinner" aria-hidden="true" />
            <p className="state__text">Checking your session…</p>
          </div>
        ) : (
          <form className="login-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
            <div className="field">
              <label className="field__label" htmlFor="admin-email">
                Email
              </label>
              <input
                id="admin-email"
                className="field__input"
                type="email"
                name="email"
                autoComplete="username"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={busy}
                required
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="admin-password">
                Password
              </label>
              <div className="field__group">
                <input
                  id="admin-password"
                  ref={passwordRef}
                  className="field__input field__input--grouped"
                  type={show ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  readOnly={busy}
                  required
                />
                <button
                  type="button"
                  className="field__toggle"
                  aria-pressed={show}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  onClick={() => setShow((value) => !value)}
                  disabled={busy}
                >
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn--primary login-button" disabled={busy} aria-busy={busy}>
              {busy ? (
                <>
                  <span className="spinner spinner--sm" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
