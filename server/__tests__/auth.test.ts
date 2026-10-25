import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authenticate, isAdminToken, requireAdmin, requirePlayer, requireUser } from '../auth.js'
import { HttpError } from '../http.js'
import { bearer, claimsFor, fakeVerify, tokenFor } from './helpers/fakeAuth.js'
import { createFakeDb } from './helpers/fakeDb.js'

const hoisted = vi.hoisted(() => ({ getAuth: vi.fn() }))
vi.mock('../firebaseAdmin.js', () => ({ getAuth: hoisted.getAuth, getDb: vi.fn() }))

async function rejection(p: Promise<unknown>): Promise<HttpError> {
  try {
    await p
  } catch (e) {
    return e as HttpError
  }
  throw new Error('expected rejection')
}

describe('authenticate', () => {
  const db = createFakeDb()
  beforeEach(() => db.resetCounters())

  const cases: Array<[string, Record<string, string | string[] | undefined>]> = [
    ['missing header', {}],
    ['empty header', { authorization: '' }],
    ['wrong scheme', { authorization: 'Basic abc' }],
    ['no token', { authorization: 'Bearer' }],
    ['token with spaces', { authorization: 'Bearer a b' }],
    ['expired / invalid token', { authorization: 'Bearer expired-token' }],
  ]
  for (const [name, headers] of cases) {
    it(`401 UNAUTHENTICATED for ${name} and touches no data`, async () => {
      const err = await rejection(authenticate({ headers }, fakeVerify))
      expect(err).toBeInstanceOf(HttpError)
      expect(err.status).toBe(401)
      expect(err.code).toBe('UNAUTHENTICATED')
      expect(db.reads).toBe(0)
      expect(db.writes).toBe(0)
    })
  }

  it('accepts capitalised Authorization header and array header values', async () => {
    const a = await authenticate({ headers: { Authorization: `bearer ${tokenFor('player')}` } }, fakeVerify)
    expect(a.uid).toBe('u1')
    const b = await authenticate({ headers: { authorization: [`Bearer ${tokenFor('player')}`] } }, fakeVerify)
    expect(b.uid).toBe('u1')
  })

  it('maps claims to AuthUser with display name fallbacks', async () => {
    expect(await authenticate({ headers: bearer('player') }, fakeVerify)).toEqual({
      uid: 'u1', email: 'player1@example.test', displayName: 'Alice', photoURL: 'https://img.test/a.png', isAdmin: false,
    })
    expect((await authenticate({ headers: bearer('noName') }, fakeVerify)).displayName).toBe('noname')
    const none = await authenticate({ headers: bearer('noEmail') }, fakeVerify)
    expect(none).toMatchObject({ email: null, displayName: 'Player', photoURL: null })
  })

  it('uses the Firebase Admin verifier when none is injected', async () => {
    const verifyIdToken = vi.fn(async () => claimsFor('player2'))
    hoisted.getAuth.mockReturnValue({ verifyIdToken })
    const user = await authenticate({ headers: { authorization: 'Bearer real-token' } })
    expect(verifyIdToken).toHaveBeenCalledWith('real-token')
    expect(user.uid).toBe('u2')
    verifyIdToken.mockRejectedValueOnce(new Error('bad'))
    expect((await rejection(requireUser({ headers: { authorization: 'Bearer x' } }))).code).toBe('UNAUTHENTICATED')
  })

  it('config errors from the Admin SDK are not turned into 401', async () => {
    hoisted.getAuth.mockImplementation(() => {
      throw new Error('missing env')
    })
    const err = await rejection(authenticate({ headers: { authorization: 'Bearer x' } }))
    expect(err).not.toBeInstanceOf(HttpError)
  })
})

describe('isAdminToken', () => {
  it('is true only for the exact admin email (case-insensitive) with password provider', () => {
    expect(isAdminToken(claimsFor('admin'))).toBe(true)
    expect(isAdminToken(claimsFor('adminUpper'))).toBe(true)
    expect(isAdminToken(claimsFor('googleAdminEmail'))).toBe(false)
    expect(isAdminToken(claimsFor('nonAdminPassword'))).toBe(false)
    expect(isAdminToken(claimsFor('player'))).toBe(false)
    expect(isAdminToken(claimsFor('noEmail'))).toBe(false)
    expect(isAdminToken({ ...claimsFor('admin'), email: 'xadminox@gmail.com' })).toBe(false)
    expect(isAdminToken({ ...claimsFor('admin'), email: 'adminox@gmail.com.evil.test' })).toBe(false)
  })
})

describe('requirePlayer / requireAdmin', () => {
  it('requirePlayer lets players through and rejects the admin with 403 ADMIN_ACCOUNT', async () => {
    expect((await requirePlayer({ headers: bearer('player') }, fakeVerify)).uid).toBe('u1')
    const err = await rejection(requirePlayer({ headers: bearer('admin') }, fakeVerify))
    expect([err.status, err.code]).toEqual([403, 'ADMIN_ACCOUNT'])
  })

  it('Google account with the admin email is a player, not admin', async () => {
    expect((await requirePlayer({ headers: bearer('googleAdminEmail') }, fakeVerify)).isAdmin).toBe(false)
    const err = await rejection(requireAdmin({ headers: bearer('googleAdminEmail') }, fakeVerify))
    expect([err.status, err.code]).toEqual([403, 'FORBIDDEN'])
  })

  it('requireAdmin lets the admin through and rejects others with 403 FORBIDDEN', async () => {
    expect((await requireAdmin({ headers: bearer('admin') }, fakeVerify)).isAdmin).toBe(true)
    for (const kind of ['player', 'nonAdminPassword'] as const) {
      const err = await rejection(requireAdmin({ headers: bearer(kind) }, fakeVerify))
      expect([err.status, err.code]).toEqual([403, 'FORBIDDEN'])
    }
  })

  it('both reject unauthenticated callers with 401', async () => {
    expect((await rejection(requirePlayer({ headers: {} }, fakeVerify))).status).toBe(401)
    expect((await rejection(requireAdmin({ headers: {} }, fakeVerify))).status).toBe(401)
  })
})
