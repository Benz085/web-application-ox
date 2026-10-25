import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'
import { AuthError, AuthLoading } from './AuthStatus'
import NotAuthorized from './NotAuthorized'

/** Layout-route guard: logged out -> /login/admin; signed-in non-admin -> not-authorized state. */
export default function RequireAdmin() {
  const { user, loading, isAdmin, error } = useAuth()

  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login/admin" replace />
  if (error) return <AuthError />
  if (!isAdmin) return <NotAuthorized />
  return <Outlet />
}
