import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/web-app-ox/auth/useAuth'

const CANCELLED_CODES = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']

function errorCode(cause: unknown): string {
  if (typeof cause === 'object' && cause !== null && 'code' in cause && typeof cause.code === 'string') {
    return cause.code
  }
  return ''
}

export default function LoginPage() {
  const { user, loading, isAdmin, signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && user) return <Navigate to={isAdmin ? '/admin' : '/'} replace />

  const checking = loading && !busy

  async function handleSignIn() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (cause) {
      setError(
        CANCELLED_CODES.includes(errorCode(cause))
          ? 'Sign-in was cancelled. Please try again.'
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <main className="card login-card">
        <div className="login-logo" aria-hidden="true">
          <svg viewBox="0 0 96 96" width="96" height="96">
            <rect width="96" height="96" rx="22" fill="#eef2ff" />
            <g stroke="#c7d2fe" strokeWidth="3" strokeLinecap="round">
              <line x1="35" y1="12" x2="35" y2="84" />
              <line x1="61" y1="12" x2="61" y2="84" />
              <line x1="12" y1="35" x2="84" y2="35" />
              <line x1="12" y1="61" x2="84" y2="61" />
            </g>
            <path d="M16 16 L28 28 M28 16 L16 28" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" />
            <circle cx="48" cy="48" r="7" fill="none" stroke="#ea580c" strokeWidth="4" />
            <path d="M68 68 L80 80 M80 68 L68 80" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="login-title">OX Game</h1>
        <p className="login-text">Play tic-tac-toe against a bot.</p>
        <p className="login-text">Sign in to save your score and climb the leaderboard.</p>

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
          <>
            <button
              type="button"
              className="btn btn--secondary login-button"
              onClick={() => void handleSignIn()}
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? (
                <>
                  <span className="spinner spinner--sm" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                <>
                  <span className="login-g" aria-hidden="true">
                    G
                  </span>
                  Sign in with Google
                </>
              )}
            </button>
            {busy ? (
              <p className="login-note" role="status">
                Finish signing in with Google in the popup window.
              </p>
            ) : (
              <>
                <p className="login-note">Only Google accounts are supported.</p>
                <p className="login-note">You need to sign in before you can play.</p>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
