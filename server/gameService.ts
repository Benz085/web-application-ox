import { chooseMove, BOT_MARK, PLAYER_MARK } from '../shared/bot.js'
import { applyMove, isDraw, isLegalMove, isOver, newBoard, winner } from '../shared/board.js'
import { apply } from '../shared/scoring.js'
import type { Game, GameOutcome, GameStatus, Difficulty, Profile } from '../shared/types.js'
import { getHardMistakeRate } from './config.js'
import { GAMES, USERS } from './db.js'
import type { Data, Db, DbTx } from './db.js'
import { pickInProgress, toGame, toRecord } from './gameRepo.js'
import type { GameRecord } from './gameRepo.js'
import { HttpError } from './http.js'
import { statsOf, toProfile } from './userRepo.js'

export interface ServiceOptions {
  rng?: () => number
  now?: () => Date
}

const OUTCOME_STATUS: Record<GameOutcome, GameStatus> = { win: 'won', loss: 'lost', draw: 'draw' }

export async function getCurrentGame(db: Db, uid: string): Promise<Game | null> {
  const open = pickInProgress(await db.queryEq(GAMES, 'uid', uid), uid)
  return open ? toGame(open) : null
}

export async function startGame(db: Db, uid: string, difficulty: Difficulty, opts: ServiceOptions = {}): Promise<Game> {
  const now = (opts.now ?? (() => new Date()))()
  return db.runTransaction(async (tx) => {
    const existing = pickInProgress(await tx.queryEq(GAMES, 'uid', uid), uid)
    if (existing) throw new HttpError(409, 'GAME_IN_PROGRESS', 'A game is already in progress')
    const id = tx.newId(GAMES)
    const board = newBoard()
    tx.set(GAMES, id, { uid, difficulty, board, status: 'in_progress', createdAt: now, updatedAt: now })
    return { id, difficulty, board, status: 'in_progress' as const }
  })
}

async function loadOwnedOpenGame(tx: DbTx, uid: string, gameId: string): Promise<GameRecord> {
  const data = await tx.get(GAMES, gameId)
  // Unknown id and someone else's game look identical (no existence leak).
  if (!data || data.uid !== uid) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found')
  const game = toRecord(gameId, data)
  if (game.status !== 'in_progress') throw new HttpError(409, 'GAME_FINISHED', 'Game is already finished')
  return game
}

/** Applies the outcome to users/{uid} and returns the new profile + game result. Call after all reads. */
function settle(
  tx: DbTx,
  uid: string,
  userDoc: Data | null,
  outcome: GameOutcome,
  now: Date,
): { profile: Profile; scoreDelta: number; bonus: boolean } {
  const { stats, result } = apply(statsOf(userDoc ?? {}), outcome)
  if (userDoc) {
    tx.update(USERS, uid, { ...stats, lastPlayedAt: now })
  } else {
    // Safety net: profile normally exists from /api/me.
    tx.set(USERS, uid, { displayName: 'Player', email: null, photoURL: null, ...stats, createdAt: now, lastPlayedAt: now })
  }
  const profile = toProfile({ ...(userDoc ?? {}), ...stats })
  return { profile, scoreDelta: result.scoreDelta, bonus: result.bonus }
}

export async function move(
  db: Db,
  uid: string,
  gameId: string,
  cell: number,
  opts: ServiceOptions = {},
): Promise<{ game: Game; profile: Profile }> {
  const now = (opts.now ?? (() => new Date()))()
  const hardMistakeRate = await getHardMistakeRate(db)
  return db.runTransaction(async (tx) => {
    const game = await loadOwnedOpenGame(tx, uid, gameId)
    if (!isLegalMove(game.board, cell)) throw new HttpError(400, 'INVALID_MOVE', 'Cell is not available')
    const userDoc = await tx.get(USERS, uid)

    let board = applyMove(game.board, cell, PLAYER_MARK)
    if (!isOver(board)) {
      board = applyMove(board, chooseMove(board, game.difficulty, { hardMistakeRate, rng: opts.rng }), BOT_MARK)
    }

    if (!isOver(board)) {
      tx.update(GAMES, gameId, { board, updatedAt: now })
      const profile = toProfile(userDoc ?? {})
      return { game: toGame({ ...game, board }), profile }
    }

    const w = winner(board)
    const outcome: GameOutcome = w === PLAYER_MARK ? 'win' : isDraw(board) ? 'draw' : 'loss'
    const { profile, scoreDelta, bonus } = settle(tx, uid, userDoc, outcome, now)
    const status = OUTCOME_STATUS[outcome]
    tx.update(GAMES, gameId, { board, status, scoreDelta, bonus, updatedAt: now, finishedAt: now })
    return { game: toGame({ ...game, board, status, scoreDelta, bonus }), profile }
  })
}

export async function abandon(db: Db, uid: string, gameId: string, opts: ServiceOptions = {}): Promise<{ game: Game }> {
  const now = (opts.now ?? (() => new Date()))()
  return db.runTransaction(async (tx) => {
    const game = await loadOwnedOpenGame(tx, uid, gameId)
    const userDoc = await tx.get(USERS, uid)
    const { scoreDelta, bonus } = settle(tx, uid, userDoc, 'loss', now)
    tx.update(GAMES, gameId, { status: 'lost', scoreDelta, bonus, updatedAt: now, finishedAt: now })
    return { game: toGame({ ...game, status: 'lost', scoreDelta, bonus }) }
  })
}
