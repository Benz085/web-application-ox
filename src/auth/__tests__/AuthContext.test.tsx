import '@/web-app-ox/test/setup'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiGet } from '@/web-app-ox/api/client'
import type { MeResponse } from '@/web-app-ox/api/types'
import { deferred, makeProfile } from '@/web-app-ox/test/fixtures'
import { AuthProvider } from '@/web-app-ox/auth/AuthContext'
import type { AuthModule, AuthUser } from '@/web-app-ox/auth/types'
import { useAuth } from '@/web-app-ox/auth/useAuth'

vi.mock('@/web-app-ox/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/web-app-ox/api/client')>('@/web-app-ox/api/client')
  return { ...actual, apiGet: vi.fn() }
})

const loadAuthMock = vi.hoisted(() => vi.fn())
vi.mock('@/web-app-ox/auth/authModule', () => ({ loadAuth: loadAuthMock }))

const subscribers: ((user: AuthUser | null) => void)[] = []
const unsubscribe = vi.fn()
const fakeAuth: AuthModule = {
  signInWithGoogle: vi.fn(),
  signInWithEmail: vi.fn(),
  signOutUser: vi.fn(),
  subscribe: vi.fn(),
  getIdToken: vi.fn(),
}

const mockedGet = vi.mocked(apiGet)

const ALEX: AuthUser = { uid: 'u1', displayName: 'Alex Morgan', email: 'alex@x.test', photoURL: null }
const BOB: AuthUser = { uid: 'u2', displayName: null, email: 'bob@x.test', photoURL: null }
const ADMIN_USER: AuthUser = { uid: 'a1', displayName: null, email: 'adminox@gmail.com', photoURL: null }

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>

function emit(user: AuthUser | null) {
  act(() => subscribers.forEach((cb) => cb(user)))
}

beforeEach(() => {
  subscribers.length = 0
  vi.resetAllMocks()
  loadAuthMock.mockResolvedValue(fakeAuth)
  vi.mocked(fakeAuth.subscribe).mockImplementation((cb) => {
    subscribers.push(cb)
    return unsubscribe
  })
})

async function setup() {
  const view = renderHook(() => useAuth(), { wrapper })
  await waitFor(() => expect(subscribers).toHaveLength(1))
  return view
}

describe('AuthProvider state', () => {
  it('is loading until the auth state is known', async () => {
    const { result } = await setup()
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('settles as signed out without calling /api/me', async () => {
    const { result } = await setup()
    emit(null)
    expect(result.current).toMatchObject({ loading: false, user: null, isAdmin: false, displayName: '', initials: '' })
    expect(mockedGet).not.toHaveBeenCalled()
  })

  it('stays loading for a signed-in user until /api/me settles, then exposes profile and names', async () => {
    const me = deferred<MeResponse>()
    mockedGet.mockReturnValue(me.promise)
    const { result } = await setup()
    emit(ALEX)
    expect(result.current.loading).toBe(true)
    expect(mockedGet).toHaveBeenCalledWith('/api/me', expect.any(AbortSignal))
    const profile = makeProfile()
    await act(async () => me.resolve({ profile, isAdmin: false }))
    expect(result.current).toMatchObject({
      loading: false,
      isAdmin: false,
      profile,
      displayName: 'Alex Morgan',
      initials: 'AM',
      error: null,
    })
  })

  it('exposes the admin identity from /api/me (AC-28)', async () => {
    mockedGet.mockResolvedValue({ profile: null, isAdmin: true })
    const { result } = await setup()
    emit(ADMIN_USER)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current).toMatchObject({ isAdmin: true, profile: null, displayName: 'Admin OX', initials: 'AO' })
  })

  it('exposes the /api/me error and recovers through refresh()', async () => {
    mockedGet.mockRejectedValueOnce(new Error('me failed'))
    const { result } = await setup()
    emit(ALEX)
    await waitFor(() => expect(result.current.error?.message).toBe('me failed'))
    expect(result.current.loading).toBe(false)

    mockedGet.mockResolvedValueOnce({ profile: makeProfile(), isAdmin: false })
    act(() => result.current.refresh())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.profile).not.toBeNull())
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(mockedGet).toHaveBeenCalledTimes(2)
  })

  it('wraps a non-Error rejection in a generic Error', async () => {
    mockedGet.mockRejectedValueOnce('nope')
    const { result } = await setup()
    emit(ALEX)
    await waitFor(() => expect(result.current.error?.message).toBe('Failed to load profile'))
  })

  it('ignores a failure from a request that was aborted by a user change', async () => {
    const first = deferred<MeResponse>()
    mockedGet.mockReturnValueOnce(first.promise)
    mockedGet.mockResolvedValueOnce({ profile: null, isAdmin: false })
    const { result } = await setup()
    emit(ALEX)
    emit(BOB)
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => first.reject(new Error('stale failure')))
    expect(result.current.error).toBeNull()
    expect(result.current.user).toEqual(BOB)
    expect(result.current.displayName).toBe('bob')
  })

  it('does not reuse the previous user data while the next user is loading', async () => {
    const second = deferred<MeResponse>()
    mockedGet.mockResolvedValueOnce({ profile: null, isAdmin: true })
    mockedGet.mockReturnValueOnce(second.promise)
    const { result } = await setup()
    emit(ADMIN_USER)
    await waitFor(() => expect(result.current.isAdmin).toBe(true))
    emit(ALEX)
    expect(result.current.loading).toBe(true)
    expect(result.current.isAdmin).toBe(false)
  })

  it('unsubscribes on unmount', async () => {
    const { unmount } = await setup()
    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('does not subscribe when unmounted before the auth module loaded', async () => {
    const gate = deferred<AuthModule>()
    loadAuthMock.mockReturnValue(gate.promise)
    const { unmount } = renderHook(() => useAuth(), { wrapper })
    unmount()
    await act(async () => gate.resolve(fakeAuth))
    expect(fakeAuth.subscribe).not.toHaveBeenCalled()
    expect(unsubscribe).not.toHaveBeenCalled()
  })
})

describe('AuthProvider actions', () => {
  it('signInWithGoogle and signOut delegate to the auth module', async () => {
    const { result } = await setup()
    await act(() => result.current.signInWithGoogle())
    await act(() => result.current.signOut())
    expect(fakeAuth.signInWithGoogle).toHaveBeenCalledTimes(1)
    expect(fakeAuth.signOutUser).toHaveBeenCalledTimes(1)
  })

  it('signInWithEmail resolves true for an admin and keeps the session', async () => {
    mockedGet.mockResolvedValue({ profile: null, isAdmin: true })
    const { result } = await setup()
    await expect(result.current.signInWithEmail('adminox@gmail.com', 'pw')).resolves.toBe(true)
    expect(fakeAuth.signInWithEmail).toHaveBeenCalledWith('adminox@gmail.com', 'pw')
    expect(fakeAuth.signOutUser).not.toHaveBeenCalled()
  })

  it('signInWithEmail signs a non-admin out and resolves false (AC-27)', async () => {
    mockedGet.mockResolvedValue({ profile: null, isAdmin: false })
    const { result } = await setup()
    await expect(result.current.signInWithEmail('x@y.test', 'pw')).resolves.toBe(false)
    expect(fakeAuth.signOutUser).toHaveBeenCalledTimes(1)
  })

  it('signInWithEmail signs out and re-throws when /api/me fails', async () => {
    const failure = new Error('server down')
    mockedGet.mockRejectedValue(failure)
    const { result } = await setup()
    await expect(result.current.signInWithEmail('x@y.test', 'pw')).rejects.toBe(failure)
    expect(fakeAuth.signOutUser).toHaveBeenCalledTimes(1)
  })

  it('signInWithEmail signs out and resolves false when the server refuses the account (403)', async () => {
    mockedGet.mockRejectedValue(new ApiError(403, 'FORBIDDEN_ACCOUNT', 'This account type is not allowed'))
    const { result } = await setup()
    await expect(result.current.signInWithEmail('x@y.test', 'pw')).resolves.toBe(false)
    expect(fakeAuth.signOutUser).toHaveBeenCalledTimes(1)
  })

  it('signInWithEmail propagates a credential error without calling /api/me', async () => {
    const failure = Object.assign(new Error('bad'), { code: 'auth/invalid-credential' })
    vi.mocked(fakeAuth.signInWithEmail).mockRejectedValueOnce(failure)
    const { result } = await setup()
    await expect(result.current.signInWithEmail('x@y.test', 'pw')).rejects.toBe(failure)
    expect(mockedGet).not.toHaveBeenCalled()
  })
})

describe('AuthProvider rendering', () => {
  it('renders children', async () => {
    render(
      <AuthProvider>
        <p>child content</p>
      </AuthProvider>,
    )
    expect(screen.getByText('child content')).toBeInTheDocument()
    await waitFor(() => expect(subscribers).toHaveLength(1))
  })
})
