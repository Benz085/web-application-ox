import { useAuth } from '@/web-app-ox/auth/useAuth'

export function AuthLoading() {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" />
      <p className="state__text">Loading…</p>
    </div>
  )
}

export function AuthError() {
  const { error, refresh, signOut } = useAuth()
  return (
    <div className="state">
      <div className="alert" role="alert">
        <p className="alert__title">Could not load your account</p>
        <p className="alert__text">{error?.message ?? 'Something went wrong. Try again.'}</p>
      </div>
      <div className="state__actions">
        <button type="button" className="btn btn--primary" onClick={refresh}>
          Try again
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </div>
  )
}
