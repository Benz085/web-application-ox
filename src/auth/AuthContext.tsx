import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiGet } from '../api/client'
import type { MeResponse } from '../api/types'
import { loadAuth } from './authModule'
import { getDisplayName, getInitials } from './displayName'
import { AuthContext, type AuthContextValue } from './authContextValue'
import type { AuthUser } from './types'

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
