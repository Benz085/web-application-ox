import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/web-app-ox/auth/authContextValue'
import type { AuthUser } from '@/web-app-ox/auth/types'
import { LocationProbe } from '@/web-app-ox/test/LocationProbe'

export const PLAYER_USER: AuthUser = {
  uid: 'player-1',
  displayName: 'Alex Morgan',
  email: 'alex.morgan@example.test',
  photoURL: null,
}

/** A signed-in, non-admin player with all actions as vi.fn(). Override per test. */
export function makeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: PLAYER_USER,
    loading: false,
    isAdmin: false,
    profile: null,
    displayName: 'Alex Morgan',
    initials: 'AM',
    error: null,
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    signInWithEmail: vi.fn().mockResolvedValue(true),
    signOut: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn(),
    ...overrides,
  }
}

export const SIGNED_OUT: Partial<AuthContextValue> = {
  user: null,
  displayName: '',
  initials: '',
}

export const ADMIN: Partial<AuthContextValue> = {
  user: { uid: 'admin-1', displayName: null, email: 'adminox@gmail.com', photoURL: null },
  isAdmin: true,
  displayName: 'Admin OX',
  initials: 'AO',
}

export interface RenderOptions {
  route?: string
  auth?: Partial<AuthContextValue>
}

/** Renders ui inside a MemoryRouter and a fake AuthContext; setAuth re-renders with new auth values. */
export function renderAt(ui: ReactElement, { route = '/', auth = {} }: RenderOptions = {}) {
  let current = makeAuth(auth)
  const tree = (value: AuthContextValue) => (
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
        <LocationProbe />
      </MemoryRouter>
    </AuthContext.Provider>
  )
  const result = render(tree(current))
  return {
    ...result,
    get auth() {
      return current
    },
    setAuth(next: Partial<AuthContextValue>) {
      current = { ...current, ...next }
      result.rerender(tree(current))
    },
  }
}
