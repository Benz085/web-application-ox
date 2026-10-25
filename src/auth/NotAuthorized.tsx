import { Link } from 'react-router-dom'

export default function NotAuthorized() {
  return (
    <section className="card state state--card" aria-labelledby="not-authorized-title">
      <div className="state__icon state__icon--amber" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <h1 id="not-authorized-title" className="state__title">
        Not authorized
      </h1>
      <p className="state__text">You don&apos;t have permission to view this page.</p>
      <p className="state__hint">The admin page is only for approved accounts.</p>
      <Link className="btn btn--primary" to="/">
        Back to Play
      </Link>
    </section>
  )
}
