import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '@/web-app-ox/auth/authContextValue'

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
