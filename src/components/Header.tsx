import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

function LogoMark() {
  return (
    <span className="brand__logo" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="20" height="20" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
        <path d="M5 5 L15 15 M15 5 L5 15" />
        <circle cx="22" cy="22" r="6" />
      </svg>
    </span>
  )
}

function navClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'nav-link nav-link--active' : 'nav-link'
}

/** Renders nothing while signed out (mockup 08-E). */
export default function Header() {
  const { user, isAdmin, loading, displayName, initials, signOut } = useAuth()
  const navigate = useNavigate()

  if (!user || loading) return null

  async function handleSignOut() {
    const target = isAdmin ? '/login/admin' : '/login'
    await signOut()
    navigate(target, { replace: true })
  }

  return (
    <header className="app-header">
      <div className="app-header__bar">
        <Link className="brand" to="/">
          <LogoMark />
          <span className="brand__name">OX Game</span>
        </Link>
        <nav className="app-nav" aria-label="Main">
          {!isAdmin && (
            <NavLink to="/" end className={navClass}>
              Play
            </NavLink>
          )}
          <NavLink to="/leaderboard" className={navClass}>
            Leaderboard
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navClass}>
              Admin
            </NavLink>
          )}
        </nav>
        <div className="app-header__user">
          {user.photoURL ? (
            <img className="avatar" src={user.photoURL} alt="" aria-hidden="true" referrerPolicy="no-referrer" />
          ) : (
            <span className="avatar" aria-hidden="true">
              {initials}
            </span>
          )}
          <span className="user-name" title={displayName}>
            {displayName}
          </span>
          <button type="button" className="btn btn--pill" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
