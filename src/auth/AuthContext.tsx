import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiError, apiGet } from '@/web-app-ox/api/client'
import type { MeResponse } from '@/web-app-ox/api/types'
import { loadAuth } from '@/web-app-ox/auth/authModule'
import { getDisplayName, getInitials } from '@/web-app-ox/auth/displayName'
import { AuthContext, type AuthContextValue } from '@/web-app-ox/auth/authContextValue'
import type { AuthUser } from '@/web-app-ox/auth/types'

interface MeState {
  uid: string
  data: MeResponse | null
  error: Error | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [meState, setMeState] = useState<MeState | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    void loadAuth().then((auth) => {
      if (cancelled) return
      unsubscribe = auth.subscribe((next) => {
        setUser(next)
        setAuthReady(true)
      })
    })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  const uid = user?.uid ?? null

  useEffect(() => {
    if (!uid) return
    const controller = new AbortController()
    apiGet<MeResponse>('/api/me', controller.signal).then(
      (data) => setMeState({ uid, data, error: null }),
      (cause: unknown) => {
        if (controller.signal.aborted) return
        setMeState({
          uid,
          data: null,
          error: cause instanceof Error ? cause : new Error('Failed to load profile'),
        })
      },
    )
    return () => controller.abort()
  }, [uid, reloadKey])

  const me = meState && meState.uid === uid ? meState : null
  const isAdmin = me?.data?.isAdmin ?? false
  const loading = !authReady || (uid !== null && me === null)

  const signInWithGoogle = useCallback(async () => {
    const auth = await loadAuth()
    await auth.signInWithGoogle()
  }, [])

  const signOut = useCallback(async () => {
    const auth = await loadAuth()
    await auth.signOutUser()
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const auth = await loadAuth()
    await auth.signInWithEmail(email, password)
    try {
      const data = await apiGet<MeResponse>('/api/me')
      if (!data.isAdmin) await auth.signOutUser()
      return data.isAdmin
    } catch (cause) {
      await auth.signOutUser()
      // The server refuses accounts that are neither the admin nor a Google player (403):
      // treat that exactly like "not an admin" so the page shows the generic message.
      if (cause instanceof ApiError && cause.status === 403) return false
      throw cause
    }
  }, [])

  const refresh = useCallback(() => {
    setMeState(null)
    setReloadKey((key) => key + 1)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const displayName = user ? getDisplayName(user, isAdmin) : ''
    return {
      user,
      loading,
      isAdmin,
      profile: me?.data?.profile ?? null,
      displayName,
      initials: user ? getInitials(displayName, isAdmin) : '',
      error: me?.error ?? null,
      signInWithGoogle,
      signInWithEmail,
      signOut,
      refresh,
    }
  }, [user, loading, isAdmin, me, signInWithGoogle, signInWithEmail, signOut, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
