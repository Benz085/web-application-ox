import { describe, expect, it } from 'vitest'
import { getOrCreateProfile, getProfile, listAllPlayers, listLeaderboard, statsOf, toProfile } from '../userRepo.js'
import type { Db } from '../db.js'
import { createFakeDb } from './helpers/fakeDb.js'

const input = { displayName: 'Alice', email: 'alice@example.test', photoURL: null }
const stats = (score: number, wins: number, losses = 0, draws = 0, streak = 0) => ({ score, wins, losses, draws, streak })

function user(db: ReturnType<typeof createFakeDb>, id: string, name: string, s: ReturnType<typeof stats>, extra = {}) {
  db.seed('users', id, { displayName: name, email: `${id}@example.test`, photoURL: null, ...s, ...extra })
}

describe('profile mapping', () => {
  it('statsOf / toProfile sanitise bad values', () => {
    expect(statsOf({ score: 'x', wins: NaN, losses: Infinity, draws: 2, streak: 1 })).toEqual({ score: 0, streak: 1, wins: 0, losses: 0, draws: 2 })
    expect(toProfile({ displayName: '', photoURL: 5 })).toEqual({ displayName: 'Player', photoURL: null, score: 0, streak: 0, wins: 0, losses: 0, draws: 0 })
    expect(toProfile({ displayName: 'A', photoURL: 'http://p' }).photoURL).toBe('http://p')
  })
})

describe('getOrCreateProfile', () => {
  it('creates a zeroed profile on first call', async () => {
    const db = createFakeDb()
    const now = new Date('2026-01-01T00:00:00Z')
    const p = await getOrCreateProfile(db, 'u1', input, now)
    expect(p).toEqual({ displayName: 'Alice', photoURL: null, score: 0, streak: 0, wins: 0, losses: 0, draws: 0 })
    expect(db.peek('users', 'u1')).toMatchObject({ email: 'alice@example.test', createdAt: now, lastPlayedAt: null })
    expect(db.writes).toBe(1)
  })

  it('uses the current time by default', async () => {
    const db = createFakeDb()
    await getOrCreateProfile(db, 'u1', input)
    expect(db.peek('users', 'u1')?.createdAt).toBeInstanceOf(Date)
  })

  it('never resets an existing profile and does not write again', async () => {
    const db = createFakeDb()
    user(db, 'u1', 'Old Name', stats(7, 5, 1, 1, 2))
    const p = await getOrCreateProfile(db, 'u1', input)
    expect(p).toMatchObject({ displayName: 'Old Name', score: 7, wins: 5, streak: 2 })
    expect(db.writes).toBe(0)
    expect(db.peek('users', 'u1')?.displayName).toBe('Old Name')
  })

  it('on a lost creation race returns what the winner wrote', async () => {
    const real = createFakeDb()
    let first = true
    const racing: Db = {
      ...real,
      get: async (c, id) => {
        if (first) {
          first = false
          return null
        }
        return real.get(c, id)
      },
      createIfAbsent: async () => {
        real.seed('users', 'u1', { displayName: 'Winner', score: 3, wins: 3 })
        return false
      },
    }
    expect((await getOrCreateProfile(racing, 'u1', input)).displayName).toBe('Winner')
  })

  it('falls back to the fresh profile if the winner doc vanished', async () => {
    const real = createFakeDb()
    const odd: Db = { ...real, get: async () => null, createIfAbsent: async () => false }
    expect((await getOrCreateProfile(odd, 'u1', input)).displayName).toBe('Alice')
  })
})

describe('getProfile', () => {
  it('returns null when absent, profile when present', async () => {
    const db = createFakeDb()
    expect(await getProfile(db, 'u1')).toBeNull()
    user(db, 'u1', 'A', stats(1, 1))
    expect((await getProfile(db, 'u1'))?.score).toBe(1)
  })
})

describe('listLeaderboard', () => {
  it('excludes users with no games, sorts by score, wins, name, ranks sequentially, hides email', async () => {
    const db = createFakeDb()
    user(db, 'a', 'Zed', stats(5, 5))
    user(db, 'b', 'Amy', stats(5, 5))
    user(db, 'c', 'Bob', stats(5, 6, 1))
    user(db, 'd', 'Top', stats(9, 9))
    user(db, 'e', 'Idle', stats(0, 0))
    user(db, 'f', 'Drawer', stats(0, 0, 0, 1))
    user(db, 'g', 'Neg', stats(-2, 0, 2))
    const rows = await listLeaderboard(db)
    expect(rows.map((r) => r.displayName)).toEqual(['Top', 'Bob', 'Amy', 'Zed', 'Drawer', 'Neg'])
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6])
    for (const r of rows) {
      expect(Object.keys(r).sort()).toEqual(['displayName', 'draws', 'losses', 'photoURL', 'rank', 'score', 'wins'])
      expect(r).not.toHaveProperty('email')
    }
    expect(JSON.stringify(rows)).not.toContain('example.test')
  })

  it('returns at most 100 entries', async () => {
    const db = createFakeDb()
    for (let i = 0; i < 120; i++) user(db, `u${i}`, `P${i}`, stats(i, 1))
    const rows = await listLeaderboard(db)
    expect(rows).toHaveLength(100)
    expect(rows[0].score).toBe(119)
  })
})

describe('listAllPlayers', () => {
  it('includes email and users with zero games; lastPlayedAt is ISO or null', async () => {
    const db = createFakeDb()
    user(db, 'a', 'Zed', stats(3, 3), { lastPlayedAt: new Date('2026-02-03T04:05:06Z') })
    user(db, 'b', 'Idle', stats(0, 0), { lastPlayedAt: null })
    user(db, 'c', 'Amy', stats(3, 3), { lastPlayedAt: new Date('invalid') })
    db.seed('users', 'd', { score: 1, wins: 1 }) // no name / email
    const rows = await listAllPlayers(db)
    expect(rows.map((r) => r.uid)).toEqual(['c', 'a', 'd', 'b'])
    const byId = Object.fromEntries(rows.map((r) => [r.uid, r]))
    expect(byId.a).toMatchObject({ email: 'a@example.test', lastPlayedAt: '2026-02-03T04:05:06.000Z' })
    expect(byId.b).toMatchObject({ email: 'b@example.test', lastPlayedAt: null, score: 0 })
    expect(byId.c.lastPlayedAt).toBeNull()
    expect(byId.d).toMatchObject({ displayName: 'Player', email: '' })
  })
})
