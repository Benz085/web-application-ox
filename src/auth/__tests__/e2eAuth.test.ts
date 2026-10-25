import '@/web-app-ox/test/setup'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@/web-app-ox/auth/types'

type E2e = typeof import('@/web-app-ox/auth/e2eAuth')

async function load(): Promise<E2e> {
  vi.resetModules()
  return import('@/web-app-ox/auth/e2eAuth')
}

function current(mod: E2e): AuthUser | null {
  let seen: AuthUser | null = null
  mod.subscribe((u) => {
    seen = u
  })()
  return seen
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('e2eAuth initial user', () => {
  it('defaults to the fake player', async () => {
    const mod = await load()
    expect(current(mod)).toMatchObject({ uid: 'e2e-player', displayName: 'Alex Morgan' })
  })

  it('picks the admin from ?e2eUser=admin and remembers it', async () => {
    window.history.replaceState(null, '', '/?e2eUser=admin')
    const mod = await load()
    expect(current(mod)).toMatchObject({ uid: 'e2e-admin', email: 'adminox@gmail.com' })
    expect(window.localStorage.getItem('e2eUser')).toBe('admin')
  })

  it('picks no user from ?e2eUser=none', async () => {
    window.history.replaceState(null, '', '/?e2eUser=none')
    expect(current(await load())).toBeNull()
  })

  it('reads the choice from localStorage when the query is absent', async () => {
    window.localStorage.setItem('e2eUser', 'admin')
    expect(current(await load())).toMatchObject({ uid: 'e2e-admin' })
  })

  it.each([
    ['query', '/?e2eUser=bogus', null],
    ['storage', '/', 'bogus'],
  ])('ignores an invalid %s value and falls back to the player', async (_where, url, stored) => {
    window.history.replaceState(null, '', url)
    if (stored) window.localStorage.setItem('e2eUser', stored)
    expect(current(await load())).toMatchObject({ uid: 'e2e-player' })
  })
})

describe('e2eAuth actions', () => {
  it('subscribe calls back immediately and on every change, until unsubscribed', async () => {
    window.history.replaceState(null, '', '/?e2eUser=none')
    const mod = await load()
    const cb = vi.fn()
    const unsubscribe = mod.subscribe(cb)
    expect(cb).toHaveBeenLastCalledWith(null)
    await mod.signInWithGoogle()
    expect(cb).toHaveBeenLastCalledWith(expect.objectContaining({ uid: 'e2e-player' }))
    await mod.signOutUser()
    expect(cb).toHaveBeenLastCalledWith(null)
    expect(window.localStorage.getItem('e2eUser')).toBe('none')
    unsubscribe()
    cb.mockClear()
    await mod.signInWithGoogle()
    expect(cb).not.toHaveBeenCalled()
  })

  it('signs in the admin with the fixed email (case-insensitive, trimmed) and any password', async () => {
    window.history.replaceState(null, '', '/?e2eUser=none')
    const mod = await load()
    await mod.signInWithEmail('  AdminOX@Gmail.com ', 'pw')
    expect(current(mod)).toMatchObject({ uid: 'e2e-admin' })
  })

  it.each([
    ['wrong email', 'other@example.test', 'pw'],
    ['empty password', 'adminox@gmail.com', ''],
  ])('rejects with auth/invalid-credential for %s', async (_name, email, password) => {
    window.history.replaceState(null, '', '/?e2eUser=none')
    const mod = await load()
    await expect(mod.signInWithEmail(email, password)).rejects.toMatchObject({ code: 'auth/invalid-credential' })
    expect(current(mod)).toBeNull()
  })

  it('getIdToken is fake for a user and null when signed out', async () => {
    const mod = await load()
    await expect(mod.getIdToken()).resolves.toBe('e2e-token-e2e-player')
    await mod.signOutUser()
    await expect(mod.getIdToken()).resolves.toBeNull()
  })
})
