import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeDb } from '../../server/__tests__/helpers/fakeDb.js'
import type { FakeDb } from '../../server/__tests__/helpers/fakeDb.js'
import { bearer, fakeVerify } from '../../server/__tests__/helpers/fakeAuth.js'
import type { TokenKind } from '../../server/__tests__/helpers/fakeAuth.js'
import adminPlayers from '../admin/players.js'
import abandonH from '../game/abandon.js'
import currentH from '../game/current.js'
import moveH from '../game/move.js'
import startH from '../game/start.js'
import leaderboardH from '../leaderboard.js'
import meH from '../me.js'

const holder = vi.hoisted(() => ({ db: null as unknown, verify: null as unknown }))
vi.mock('../../server/firebaseAdmin.js', () => ({
  getDb: () => holder.db,
  getAuth: () => ({ verifyIdToken: (t: string) => (holder.verify as (t: string) => Promise<unknown>)(t) }),
}))

let db: FakeDb
beforeEach(() => {
  db = createFakeDb()
  holder.db = db
  holder.verify = fakeVerify
})

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>
interface Out { status: number; body: Record<string, any>; headers: Record<string, string> }

async function call(h: unknown, method: string, kind: TokenKind | 'none' | 'bad', body?: unknown): Promise<Out> {
  const out: Out = { status: 0, body: {}, headers: {} }
  const headers = kind === 'none' ? {} : kind === 'bad' ? { authorization: 'Bearer expired' } : bearer(kind)
  const req = { method, headers, body } as unknown as VercelRequest
  const res = {
    status(c: number) {
      out.status = c
      return { json: (b: unknown) => void (out.body = b as Out['body']) }
    },
    setHeader(n: string, v: string) {
      out.headers[n] = v
    },
  } as unknown as VercelResponse
  await (h as Handler)(req, res)
  return out
}

const seedUser = (uid: string, extra: Record<string, unknown> = {}) =>
  db.seed('users', uid, { displayName: uid, email: `${uid}@example.test`, photoURL: null, score: 0, streak: 0, wins: 0, losses: 0, draws: 0, lastPlayedAt: null, ...extra })

const routes: Array<[string, unknown, 'GET' | 'POST', string]> = [
  ['/api/me', meH, 'GET', 'GET'],
  ['/api/leaderboard', leaderboardH, 'GET', 'GET'],
  ['/api/admin/players', adminPlayers, 'GET', 'GET'],
  ['/api/game/current', currentH, 'GET', 'GET'],
  ['/api/game/start', startH, 'POST', 'POST'],
  ['/api/game/move', moveH, 'POST', 'POST'],
  ['/api/game/abandon', abandonH, 'POST', 'POST'],
]

describe.each(routes)('%s common behaviour', (_path, handler, method) => {
  const wrong = method === 'GET' ? 'POST' : 'GET'
  it('wrong method -> 405 with Allow header and no data access', async () => {
    const r = await call(handler, wrong, 'player', {})
    expect(r.status).toBe(405)
    expect(r.body.error.code).toBe('METHOD_NOT_ALLOWED')
    expect(r.headers.Allow).toBe(method)
    expect(db.reads + db.writes).toBe(0)
  })
  it.each(['none', 'bad'] as const)('%s token -> 401 UNAUTHENTICATED with zero db reads/writes', async (kind) => {
    const r = await call(handler, method, kind, {})
    expect(r.status).toBe(401)
    expect(r.body).toEqual({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } })
    expect(db.reads).toBe(0)
    expect(db.writes).toBe(0)
  })
})

describe('unexpected backend failure', () => {
  it.each([
    [meH, 'GET'],
    [leaderboardH, 'GET'],
    [currentH, 'GET'],
    [startH, 'POST'],
  ] as const)('-> 500 INTERNAL_ERROR without leaking details', async (handler, method) => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    db.failReads(new Error('secret-connection-string'))
    const r = await call(handler, method, 'player', { difficulty: 'easy' })
    expect(r.status).toBe(500)
    expect(r.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
    expect(JSON.stringify(spy.mock.calls)).not.toContain('secret')
    spy.mockRestore()
  })
})

describe('GET /api/me', () => {
  it('player: creates the profile on first call and returns it, never resetting later', async () => {
    const first = await call(meH, 'GET', 'player')
    expect(first.status).toBe(200)
    expect(first.body).toEqual({
      isAdmin: false,
      profile: { displayName: 'Alice', photoURL: 'https://img.test/a.png', score: 0, streak: 0, wins: 0, losses: 0, draws: 0 },
    })
    db.seed('users', 'u1', { ...db.peek('users', 'u1')!, score: 5, wins: 5 })
    const second = await call(meH, 'GET', 'player')
    expect(second.body.profile).toMatchObject({ score: 5, wins: 5 })
  })
  it('admin: {profile:null,isAdmin:true} and no users doc created', async () => {
    const r = await call(meH, 'GET', 'admin')
    expect(r.status).toBe(200)
    expect(r.body).toEqual({ profile: null, isAdmin: true })
    expect(db.all('users')).toHaveLength(0)
    expect(db.writes).toBe(0)
  })
  it('Google account with the admin email is a normal player', async () => {
    const r = await call(meH, 'GET', 'googleAdminEmail')
    expect(r.body.isAdmin).toBe(false)
    expect(r.body.profile.displayName).toBe('Fake Admin')
  })
})

describe('GET /api/leaderboard', () => {
  it('any signed-in user (also admin) sees ranked players without email', async () => {
    seedUser('a', { score: 3, wins: 3 })
    seedUser('b', { score: 5, wins: 5 })
    seedUser('c')
    for (const kind of ['player', 'admin', 'nonAdminPassword'] as const) {
      const r = await call(leaderboardH, 'GET', kind)
      expect(r.status).toBe(200)
      expect(r.body.players.map((p: { displayName: string }) => p.displayName)).toEqual(['b', 'a'])
      expect(r.body.players.map((p: { rank: number }) => p.rank)).toEqual([1, 2])
      expect(JSON.stringify(r.body)).not.toContain('email')
      expect(JSON.stringify(r.body)).not.toContain('example.test')
    }
  })
})

describe('GET /api/admin/players', () => {
  it('admin gets all players including email and zero-game users', async () => {
    seedUser('a', { score: 3, wins: 3 })
    seedUser('idle')
    const r = await call(adminPlayers, 'GET', 'admin')
    expect(r.status).toBe(200)
    expect(r.body.players).toHaveLength(2)
    expect(r.body.players[0]).toMatchObject({ uid: 'a', email: 'a@example.test', lastPlayedAt: null })
  })
  it.each(['player', 'nonAdminPassword', 'googleAdminEmail'] as const)('%s -> 403 FORBIDDEN, no data read', async (kind) => {
    seedUser('a')
    db.resetCounters()
    const r = await call(adminPlayers, 'GET', kind)
    expect(r.status).toBe(403)
    expect(r.body.error.code).toBe('FORBIDDEN')
    expect(JSON.stringify(r.body)).not.toContain('example.test')
    expect(db.reads).toBe(0)
  })
})

describe('admin on /api/game/*', () => {
  it.each([
    [currentH, 'GET', undefined],
    [startH, 'POST', { difficulty: 'easy' }],
    [moveH, 'POST', { gameId: 'g', cell: 0 }],
    [abandonH, 'POST', { gameId: 'g' }],
  ] as const)('403 ADMIN_ACCOUNT and nothing touched', async (handler, method, body) => {
    const r = await call(handler, method, 'admin', body)
    expect(r.status).toBe(403)
    expect(r.body.error.code).toBe('ADMIN_ACCOUNT')
    expect(db.reads + db.writes).toBe(0)
  })
})

describe('POST /api/game/start', () => {
  it('201 with the new game; 409 when one is in progress', async () => {
    const r = await call(startH, 'POST', 'player', { difficulty: 'hard' })
    expect(r.status).toBe(201)
    expect(r.body.game).toMatchObject({ difficulty: 'hard', status: 'in_progress', board: Array(9).fill(null) })
    expect(typeof r.body.game.id).toBe('string')
    const again = await call(startH, 'POST', 'player', { difficulty: 'easy' })
    expect(again.status).toBe(409)
    expect(again.body.error.code).toBe('GAME_IN_PROGRESS')
  })
  it('400 for bad difficulty or body (JSON string body is accepted)', async () => {
    expect((await call(startH, 'POST', 'player', { difficulty: 'medium' })).body.error.code).toBe('INVALID_DIFFICULTY')
    expect((await call(startH, 'POST', 'player', undefined)).body.error.code).toBe('INVALID_BODY')
    expect((await call(startH, 'POST', 'player', '{bad')).status).toBe(400)
    expect((await call(startH, 'POST', 'player', '{"difficulty":"easy"}')).status).toBe(201)
  })
})

describe('GET /api/game/current', () => {
  it('{game:null} then the open game', async () => {
    expect((await call(currentH, 'GET', 'player')).body).toEqual({ game: null })
    const started = await call(startH, 'POST', 'player', { difficulty: 'easy' })
    const cur = await call(currentH, 'GET', 'player')
    expect(cur.status).toBe(200)
    expect(cur.body.game).toEqual(started.body.game)
    expect((await call(currentH, 'GET', 'player2')).body).toEqual({ game: null })
  })
})

describe('POST /api/game/move', () => {
  it('plays a move and returns game + profile; validation and ownership errors', async () => {
    await call(meH, 'GET', 'player')
    const { body } = await call(startH, 'POST', 'player', { difficulty: 'easy' })
    const id = body.game.id as string

    const ok = await call(moveH, 'POST', 'player', { gameId: id, cell: 4 })
    expect(ok.status).toBe(200)
    expect(ok.body.game.board[4]).toBe('X')
    expect(ok.body.game.board.filter((c: unknown) => c === 'O')).toHaveLength(1)
    expect(ok.body.profile).toMatchObject({ score: 0 })

    expect((await call(moveH, 'POST', 'player', { gameId: id, cell: 4 })).body.error.code).toBe('INVALID_MOVE')
    expect((await call(moveH, 'POST', 'player', { gameId: id, cell: 9 })).body.error.code).toBe('INVALID_CELL')
    expect((await call(moveH, 'POST', 'player', { gameId: id, cell: '1' })).status).toBe(400)
    expect((await call(moveH, 'POST', 'player', { cell: 1 })).body.error.code).toBe('INVALID_GAME_ID')
    expect((await call(moveH, 'POST', 'player', 'nope')).body.error.code).toBe('INVALID_BODY')
    const other = await call(moveH, 'POST', 'player2', { gameId: id, cell: 0 })
    expect([other.status, other.body.error.code]).toEqual([404, 'GAME_NOT_FOUND'])
  })

  it('plays to completion, updates the score once, and rejects repeats (AC-16)', async () => {
    seedUser('u1')
    db.seed('games', 'g', { uid: 'u1', difficulty: 'easy', status: 'in_progress', board: ['X', 'X', null, 'O', 'O', null, null, null, null] })
    const win = await call(moveH, 'POST', 'player', { gameId: 'g', cell: 2 })
    expect(win.body.game).toMatchObject({ status: 'won', result: { scoreDelta: 1, bonus: false } })
    expect(win.body.profile.score).toBe(1)
    const again = await call(moveH, 'POST', 'player', { gameId: 'g', cell: 5 })
    expect([again.status, again.body.error.code]).toEqual([409, 'GAME_FINISHED'])
    expect(db.peek('users', 'u1')?.score).toBe(1)
  })
})

describe('POST /api/game/abandon', () => {
  it('counts as a loss once; repeat is 409; validation and ownership', async () => {
    seedUser('u1', { score: 1, wins: 1 })
    const { body } = await call(startH, 'POST', 'player', { difficulty: 'easy' })
    const id = body.game.id as string
    expect((await call(abandonH, 'POST', 'player', {})).body.error.code).toBe('INVALID_GAME_ID')
    expect((await call(abandonH, 'POST', 'player2', { gameId: id })).status).toBe(404)
    const r = await call(abandonH, 'POST', 'player', { gameId: id })
    expect(r.status).toBe(200)
    expect(r.body.game).toMatchObject({ status: 'lost', result: { scoreDelta: -1, bonus: false } })
    expect(db.peek('users', 'u1')).toMatchObject({ score: 0, losses: 1 })
    const repeat = await call(abandonH, 'POST', 'player', { gameId: id })
    expect([repeat.status, repeat.body.error.code]).toEqual([409, 'GAME_FINISHED'])
    expect(db.peek('users', 'u1')?.losses).toBe(1)
  })
})
