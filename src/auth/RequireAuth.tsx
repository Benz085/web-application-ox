import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from 'web-app-ox/auth/useAuth'
import { AuthError, AuthLoading } from 'web-app-ox/auth/AuthStatus'

/** Layout-route guard: logged out -> /login; admin at "/" -> /admin. */
export default function RequireAuth() {
  const { user, loading, isAdmin, error } = useAuth()
  const location = useLocation()

  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace />
  if (error) return <AuthError />
  if (isAdmin && location.pathname === '/') return <Navigate to="/admin" replace />
  return <Outlet />
}
