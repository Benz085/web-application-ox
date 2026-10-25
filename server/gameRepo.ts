import type { Board, Difficulty, Game, GameStatus } from '../shared/types.js'
import { GAMES } from './db.js'
import type { Data, DocSnap } from './db.js'

export interface GameRecord {
  id: string
  uid: string
  difficulty: Difficulty
  board: Board
  status: GameStatus
  scoreDelta?: number
  bonus?: boolean
}

const STATUSES: readonly GameStatus[] = ['in_progress', 'won', 'lost', 'draw']

export function toRecord(id: string, d: Data): GameRecord {
  const board = Array.isArray(d.board) && d.board.length === 9 ? (d.board as Board) : Array(9).fill(null)
  return {
    id,
    uid: typeof d.uid === 'string' ? d.uid : '',
    difficulty: d.difficulty === 'hard' ? 'hard' : 'easy',
    board,
    status: STATUSES.find((s) => s === d.status) ?? 'in_progress',
    scoreDelta: typeof d.scoreDelta === 'number' ? d.scoreDelta : undefined,
    bonus: typeof d.bonus === 'boolean' ? d.bonus : undefined,
  }
}

export function toGame(r: GameRecord): Game {
  const game: Game = { id: r.id, difficulty: r.difficulty, board: r.board, status: r.status }
  if (r.status !== 'in_progress' && r.scoreDelta !== undefined) {
    game.result = { scoreDelta: r.scoreDelta, bonus: r.bonus ?? false }
  }
  return game
}

/** In-progress games from a `queryEq(GAMES, 'uid', uid)` result (status filtered in code, no composite index). */
export function pickInProgress(docs: DocSnap[], uid: string): GameRecord | null {
  const open = docs.map((d) => toRecord(d.id, d.data)).filter((g) => g.uid === uid && g.status === 'in_progress')
  return open[0] ?? null
}

export { GAMES }
