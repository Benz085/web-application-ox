import type { AuthUser, Unsubscribe } from './types'

// Fake auth for E2E runs. Only loaded when VITE_E2E === 'true' (see authModule.ts).
// Pick the user with `?e2eUser=admin|player|none`; the choice is kept in localStorage.

const STORAGE_KEY = 'e2eUser'
const ADMIN_EMAIL = 'adminox@gmail.com'

const PLAYER: AuthUser = {
  uid: 'e2e-player',
  displayName: 'Alex Morgan',
  email: 'alex.morgan@example.test',
  photoURL: null,
}
const ADMIN: AuthUser = {
  uid: 'e2e-admin',
  displayName: null,
  email: ADMIN_EMAIL,
  photoURL: null,
}

type Choice = 'player' | 'admin' | 'none'

function isChoice(value: string | null): value is Choice {
  return value === 'player' || value === 'admin' || value === 'none'
}

function readChoice(): Choice {
  const fromQuery = new URLSearchParams(window.location.search).get('e2eUser')
  if (isChoice(fromQuery)) {
    window.localStorage.setItem(STORAGE_KEY, fromQuery)
    return fromQuery
  }
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return isChoice(stored) ? stored : 'player'
}

function userFor(choice: Choice): AuthUser | null {
  if (choice === 'admin') return ADMIN
  if (choice === 'player') return PLAYER
  return null
}

let current: AuthUser | null = userFor(readChoice())
const listeners = new Set<(user: AuthUser | null) => void>()

function setChoice(choice: Choice): void {
  window.localStorage.setItem(STORAGE_KEY, choice)
  current = userFor(choice)
  listeners.forEach((cb) => cb(current))
}

export async function signInWithGoogle(): Promise<void> {
  setChoice('player')
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  if (email.trim().toLowerCase() === ADMIN_EMAIL && password.length > 0) {
    setChoice('admin')
    return
  }
  const error = new Error('Invalid credentials')
  Object.assign(error, { code: 'auth/invalid-credential' })
  throw error
}

export async function signOutUser(): Promise<void> {
  setChoice('none')
}

export function subscribe(cb: (user: AuthUser | null) => void): Unsubscribe {
  listeners.add(cb)
  cb(current)
  return () => {
    listeners.delete(cb)
  }
}

export async function getIdToken(): Promise<string | null> {
  return current ? `e2e-token-${current.uid}` : null
}
