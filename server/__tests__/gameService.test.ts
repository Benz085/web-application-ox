import { beforeEach, describe, expect, it } from 'vitest'
import { abandon, getCurrentGame, move, startGame } from '../gameService.js'
import { HttpError } from '../http.js'
import type { Board } from '../../shared/types.js'
import { createFakeDb } from './helpers/fakeDb.js'
import type { FakeDb } from './helpers/fakeDb.js'

const NOW = new Date('2026-03-01T10:00:00Z')
const opts = { now: () => NOW, rng: () => 0 }
const E = null

let db: FakeDb
beforeEach(() => {
  db = createFakeDb()
})

function seedUser(uid: string, patch: Record<string, unknown> = {}) {
  db.seed('users', uid, { displayName: uid, email: `${uid}@example.test`, photoURL: null, score: 0, streak: 0, wins: 0, losses: 0, draws: 0, lastPlayedAt: null, ...patch })
}
function seedGame(id: string, uid: string, board: Board, extra: Record<string, unknown> = {}) {
  db.seed('games', id, { uid, difficulty: 'easy', board, status: 'in_progress', ...extra })
}
async function err(p: Promise<unknown>): Promise<HttpError> {
  try {
    await p
  } catch (e) {
    return e as HttpError
  }
  throw new Error('expected rejection')
}

// X plays 2 -> win.  Bot (rng 0, easy) blocks/wins at first legal otherwise.
const WIN_BOARD: Board = ['X', 'X', E, 'O', 'O', E, E, E, E]
// X plays 1 -> not over; bot (rng 0 => smart) completes O at 5 -> loss.
const LOSS_BOARD: Board = ['X', E, E, 'O', 'O', E, 'X', E, E]
// X plays 8 -> full board, no winner.
const DRAW_BOARD: Board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', E]

describe('startGame', () => {
  it('creates an in-progress game with an empty board', async () => {
    const g = await startGame(db, 'u1', 'hard', opts)
    expect(g).toMatchObject({ difficulty: 'hard', status: 'in_progress', board: Array(9).fill(null) })
    expect(db.peek('games', g.id)).toMatchObject({ uid: 'u1', status: 'in_progress', createdAt: NOW })
  })
  it('works with default clock', async () => {
    expect((await startGame(db, 'u1', 'easy')).status).toBe('in_progress')
  })
  it('409 GAME_IN_PROGRESS when one is open, nothing written; other users unaffected', async () => {
    await startGame(db, 'u1', 'easy', opts)
    db.resetCounters()
    const e = await err(startGame(db, 'u1', 'hard', opts))
    expect([e.status, e.code]).toEqual([409, 'GAME_IN_PROGRESS'])
    expect(db.writes).toBe(0)
    expect(db.all('games')).toHaveLength(1)
    await expect(startGame(db, 'u2', 'easy', opts)).resolves.toMatchObject({ status: 'in_progress' })
  })
  it('allows a new game after the previous one finished', async () => {
    seedGame('old', 'u1', Array(9).fill(null), { status: 'won' })
    await expect(startGame(db, 'u1', 'easy', opts)).resolves.toBeDefined()
  })
})

describe('getCurrentGame (resume)', () => {
  it('returns null when no game, the open game otherwise, ignoring finished/others', async () => {
    expect(await getCurrentGame(db, 'u1')).toBeNull()
    seedGame('done', 'u1', Array(9).fill(null), { status: 'lost', scoreDelta: -1 })
    seedGame('theirs', 'u2', Array(9).fill(null))
    expect(await getCurrentGame(db, 'u1')).toBeNull()
    const started = await startGame(db, 'u1', 'hard', opts)
    expect(await getCurrentGame(db, 'u1')).toEqual(started)
  })
  it('resumes mid-game board after moves', async () => {
    seedUser('u1')
    const g = await startGame(db, 'u1', 'easy', opts)
    const { game } = await move(db, 'u1', g.id, 4, opts)
    expect(await getCurrentGame(db, 'u1')).toEqual(game)
  })
})

describe('move', () => {
  it('valid move returns the bot reply and keeps the game open', async () => {
    seedUser('u1')
    const g = await startGame(db, 'u1', 'easy', opts)
    const r = await move(db, 'u1', g.id, 4, opts)
    expect(r.game.status).toBe('in_progress')
    expect(r.game.board[4]).toBe('X')
    expect(r.game.board.filter((c) => c === 'O')).toHaveLength(1)
    expect(r.game.board[0]).toBe('O') // rng 0 => first legal cell
    expect(r.game).not.toHaveProperty('result')
    expect(r.profile.score).toBe(0)
    expect(db.peek('users', 'u1')?.wins).toBe(0)
  })

  it('open-game move works even when users doc is absent (profile zeros)', async () => {
    const g = await startGame(db, 'u1', 'easy', opts)
    const r = await move(db, 'u1', g.id, 4, opts)
    expect(r.profile).toMatchObject({ displayName: 'Player', score: 0 })
  })

  it('win: +1 score, streak+1, wins+1, game won with result', async () => {
    seedUser('u1')
    seedGame('g', 'u1', WIN_BOARD)
    const r = await move(db, 'u1', 'g', 2, opts)
    expect(r.game).toMatchObject({ status: 'won', result: { scoreDelta: 1, bonus: false } })
    expect(r.profile).toMatchObject({ score: 1, streak: 1, wins: 1, losses: 0, draws: 0 })
    expect(db.peek('users', 'u1')).toMatchObject({ score: 1, streak: 1, wins: 1, lastPlayedAt: NOW })
    expect(db.peek('games', 'g')).toMatchObject({ status: 'won', scoreDelta: 1, bonus: false, finishedAt: NOW })
  })

  it('third consecutive win gives the +2 streak bonus and resets streak', async () => {
    seedUser('u1', { score: 2, streak: 2, wins: 2 })
    seedGame('g', 'u1', WIN_BOARD)
    const r = await move(db, 'u1', 'g', 2, opts)
    expect(r.game.result).toEqual({ scoreDelta: 2, bonus: true })
    expect(r.profile).toMatchObject({ score: 4, streak: 0, wins: 3 })
  })

  it('loss: -1 score, streak reset, losses+1', async () => {
    seedUser('u1', { score: 3, streak: 2, wins: 3 })
    seedGame('g', 'u1', LOSS_BOARD)
    const r = await move(db, 'u1', 'g', 1, opts)
    expect(r.game).toMatchObject({ status: 'lost', result: { scoreDelta: -1, bonus: false } })
    expect(r.game.board[5]).toBe('O')
    expect(r.profile).toMatchObject({ score: 2, streak: 0, losses: 1, wins: 3 })
  })

  it('draw: score unchanged, streak reset, draws+1', async () => {
    seedUser('u1', { score: 3, streak: 2, wins: 3 })
    seedGame('g', 'u1', DRAW_BOARD)
    const r = await move(db, 'u1', 'g', 8, opts)
    expect(r.game).toMatchObject({ status: 'draw', result: { scoreDelta: 0, bonus: false } })
    expect(r.profile).toMatchObject({ score: 3, streak: 0, draws: 1 })
  })

  it('safety net: finishing a game without a users doc creates one', async () => {
    seedGame('g', 'u1', WIN_BOARD)
    const r = await move(db, 'u1', 'g', 2, opts)
    expect(r.profile.score).toBe(1)
    expect(db.peek('users', 'u1')).toMatchObject({ score: 1, wins: 1, displayName: 'Player', email: null, createdAt: NOW })
  })

  it('works with the default clock/rng', async () => {
    seedUser('u1')
    const g = await startGame(db, 'u1', 'easy')
    const r = await move(db, 'u1', g.id, 0)
    expect(r.game.board[0]).toBe('X')
  })

  it('occupied and out-of-range cells -> 400 INVALID_MOVE, state unchanged', async () => {
    seedUser('u1')
    seedGame('g', 'u1', WIN_BOARD)
    const beforeGame = db.peek('games', 'g')
    const beforeUser = db.peek('users', 'u1')
    for (const cell of [0, 3, 9, -1]) {
      const e = await err(move(db, 'u1', 'g', cell, opts))
      expect([e.status, e.code]).toEqual([400, 'INVALID_MOVE'])
    }
    expect(db.peek('games', 'g')).toEqual(beforeGame)
    expect(db.peek('users', 'u1')).toEqual(beforeUser)
    expect(db.writes).toBe(0)
  })

  it('other user\'s or unknown game -> 404 GAME_NOT_FOUND, no change', async () => {
    seedUser('u1')
    seedUser('u2')
    seedGame('g', 'u2', WIN_BOARD)
    for (const id of ['g', 'missing']) {
      const e = await err(move(db, 'u1', id, 2, opts))
      expect([e.status, e.code]).toEqual([404, 'GAME_NOT_FOUND'])
    }
    expect(db.peek('games', 'g')?.board).toEqual(WIN_BOARD)
    expect(db.peek('users', 'u2')?.score).toBe(0)
    expect(db.peek('users', 'u1')?.score).toBe(0)
  })

  it('finished game -> 409 GAME_FINISHED; repeated winning move does not change score (AC-16)', async () => {
    seedUser('u1')
    seedGame('g', 'u1', WIN_BOARD)
    await move(db, 'u1', 'g', 2, opts)
    const snapshot = db.peek('users', 'u1')
    const game = db.peek('games', 'g')
    for (let i = 0; i < 3; i++) {
      const e = await err(move(db, 'u1', 'g', 5, opts))
      expect([e.status, e.code]).toEqual([409, 'GAME_FINISHED'])
    }
    expect(db.peek('users', 'u1')).toEqual(snapshot)
    expect(db.peek('games', 'g')).toEqual(game)
    expect(db.peek('users', 'u1')?.wins).toBe(1)
  })

  it('hard bot reads config/bot.hardMistakeRate (1 => random, 0 => minimax)', async () => {
    seedUser('u1')
    seedGame('g1', 'u1', Array(9).fill(null), { difficulty: 'hard' })
    seedGame('g2', 'u2', Array(9).fill(null), { difficulty: 'hard' })
    db.seed('config', 'bot', { hardMistakeRate: 1 })
    const random = await move(db, 'u1', 'g1', 8, { rng: () => 0 })
    expect(random.game.board[0]).toBe('O') // random pick = first legal cell
    db.seed('config', 'bot', { hardMistakeRate: 0 })
    const minimax = await move(db, 'u2', 'g2', 8, { rng: () => 0 })
    expect(minimax.game.board[4]).toBe('O') // minimax takes the centre vs a corner
  })

  it('hard bot uses the default mistake rate when config is missing', async () => {
    seedGame('g', 'u1', Array(9).fill(null), { difficulty: 'hard' })
    // rng 0.99 >= default 0.2 => minimax
    const r = await move(db, 'u1', 'g', 8, { rng: () => 0.99 })
    expect(r.game.board[4]).toBe('O')
  })
})

describe('abandon', () => {
  it('counts as a loss, finishes the game and cannot be repeated', async () => {
    seedUser('u1', { score: 2, streak: 2, wins: 2 })
    seedGame('g', 'u1', WIN_BOARD)
    const r = await abandon(db, 'u1', 'g', opts)
    expect(r.game).toMatchObject({ status: 'lost', result: { scoreDelta: -1, bonus: false } })
    expect(db.peek('users', 'u1')).toMatchObject({ score: 1, streak: 0, losses: 1, wins: 2, lastPlayedAt: NOW })
    const snap = db.peek('users', 'u1')
    const e = await err(abandon(db, 'u1', 'g', opts))
    expect([e.status, e.code]).toEqual([409, 'GAME_FINISHED'])
    expect(db.peek('users', 'u1')).toEqual(snap)
    expect(await getCurrentGame(db, 'u1')).toBeNull()
  })
  it('works with the default clock', async () => {
    seedUser('u1')
    seedGame('g', 'u1', WIN_BOARD)
    await expect(abandon(db, 'u1', 'g')).resolves.toBeDefined()
  })
  it('other user\'s / unknown game -> 404, no change', async () => {
    seedUser('u1')
    seedGame('g', 'u2', WIN_BOARD)
    for (const id of ['g', 'nope']) {
      expect((await err(abandon(db, 'u1', id, opts))).code).toBe('GAME_NOT_FOUND')
    }
    expect(db.writes).toBe(0)
    expect(db.peek('users', 'u1')?.losses).toBe(0)
  })
  it('after abandoning a new game can start', async () => {
    seedUser('u1')
    const g = await startGame(db, 'u1', 'easy', opts)
    await abandon(db, 'u1', g.id, opts)
    await expect(startGame(db, 'u1', 'easy', opts)).resolves.toBeDefined()
  })
})
