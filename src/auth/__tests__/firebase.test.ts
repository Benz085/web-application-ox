import '@/web-app-ox/test/setup'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const app = vi.hoisted(() => ({
  initializeApp: vi.fn(() => ({ name: 'app' })),
  getApps: vi.fn((): unknown[] => []),
  getApp: vi.fn(() => ({ name: 'existing' })),
}))
const authFns = vi.hoisted(() => ({
  getAuth: vi.fn(),
  onIdTokenChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('firebase/app', () => app)
vi.mock('firebase/auth', () => ({
  ...authFns,
  GoogleAuthProvider: class GoogleAuthProvider {},
}))

import {
  getIdToken,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  subscribe,
} from '@/web-app-ox/auth/firebase'

const authInstance: { currentUser: { getIdToken: () => Promise<string> } | null } = { currentUser: null }

beforeEach(() => {
  vi.clearAllMocks()
  app.getApps.mockReturnValue([])
  authFns.getAuth.mockReturnValue(authInstance)
  authInstance.currentUser = null
})

describe('firebase auth module', () => {
  it('initialises the app lazily from env, once', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'key')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'proj')
    await signOutUser()
    expect(app.initializeApp).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'key', projectId: 'proj' }))
    expect(authFns.getAuth).toHaveBeenCalledWith({ name: 'app' })
  })

  it('reuses an existing app', async () => {
    app.getApps.mockReturnValue([{}])
    await signOutUser()
    expect(app.initializeApp).not.toHaveBeenCalled()
    expect(authFns.getAuth).toHaveBeenCalledWith({ name: 'existing' })
  })

  it('signs in with a Google popup', async () => {
    await signInWithGoogle()
    expect(authFns.signInWithPopup).toHaveBeenCalledWith(authInstance, expect.any(Object))
  })

  it('signs in with email and password', async () => {
    await signInWithEmail('a@b.test', 'pw')
    expect(authFns.signInWithEmailAndPassword).toHaveBeenCalledWith(authInstance, 'a@b.test', 'pw')
  })

  it('signs out', async () => {
    await signOutUser()
    expect(authFns.signOut).toHaveBeenCalledWith(authInstance)
  })

  it('subscribe maps Firebase users to AuthUser and null', () => {
    const unsubscribe = vi.fn()
    authFns.onIdTokenChanged.mockReturnValue(unsubscribe)
    const cb = vi.fn()
    expect(subscribe(cb)).toBe(unsubscribe)
    const listener = authFns.onIdTokenChanged.mock.calls[0][1] as (u: unknown) => void
    listener({ uid: 'u', displayName: 'N', email: 'e@x.test', photoURL: 'p', extra: 1 })
    listener(null)
    expect(cb).toHaveBeenNthCalledWith(1, { uid: 'u', displayName: 'N', email: 'e@x.test', photoURL: 'p' })
    expect(cb).toHaveBeenNthCalledWith(2, null)
  })

  it('getIdToken returns the SDK token or null when signed out', async () => {
    await expect(getIdToken()).resolves.toBeNull()
    authInstance.currentUser = { getIdToken: () => Promise.resolve('fresh') }
    await expect(getIdToken()).resolves.toBe('fresh')
  })
})
