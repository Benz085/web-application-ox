import { createContext } from 'react'
import type { Profile } from 'web-app-ox/api/types'
import type { AuthUser } from 'web-app-ox/auth/types'

export interface AuthContextValue {
  user: AuthUser | null
  /** True until the auth state is known and, when signed in, GET /api/me has settled. */
  loading: boolean
  isAdmin: boolean
  profile: Profile | null
  /** Name shown in the header ("Admin OX" for admins). */
  displayName: string
  initials: string
  /** Set when GET /api/me failed for the signed-in user. */
  error: Error | null
  signInWithGoogle: () => Promise<void>
  /** Signs in, then checks /api/me. Resolves with isAdmin; non-admins are signed out first. */
  signInWithEmail: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  /** Retry GET /api/me after an error. */
  refresh: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
