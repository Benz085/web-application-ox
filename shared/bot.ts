import { applyMove, isDraw, legalMoves, winner } from './board.js'
import type { Board, Difficulty, Mark } from './types.js'

export const EASY_SMART_RATE = 0.25
export const DEFAULT_HARD_MISTAKE_RATE = 0.2
export const BOT_MARK: Mark = 'O'
export const PLAYER_MARK: Mark = 'X'

export interface BotOptions {
  rng?: () => number
  hardMistakeRate?: unknown
}

export function resolveMistakeRate(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : DEFAULT_HARD_MISTAKE_RATE
}

export function randomMove(board: Board, rng: () => number): number {
  const moves = legalMoves(board)
  if (moves.length === 0) throw new Error('No legal moves')
  return moves[Math.min(Math.floor(rng() * moves.length), moves.length - 1)]
}

/** A move that immediately wins the game for `mark`, or null. */
export function findWinningMove(board: Board, mark: Mark): number | null {
  for (const m of legalMoves(board)) {
    if (winner(applyMove(board, m, mark)) === mark) return m
  }
  return null
}

function minimaxScore(board: Board, turn: Mark, depth: number): number {
  const w = winner(board)
  if (w === BOT_MARK) return 10 - depth
  if (w === PLAYER_MARK) return depth - 10
  if (isDraw(board)) return 0
  const next: Mark = turn === BOT_MARK ? PLAYER_MARK : BOT_MARK
  const scores = legalMoves(board).map((m) => minimaxScore(applyMove(board, m, turn), next, depth + 1))
  return turn === BOT_MARK ? Math.max(...scores) : Math.min(...scores)
}

export function minimaxMove(board: Board): number {
  let best = -1
  let bestScore = -Infinity
  for (const m of legalMoves(board)) {
    const s = minimaxScore(applyMove(board, m, BOT_MARK), PLAYER_MARK, 1)
    if (s > bestScore) {
      bestScore = s
      best = m
    }
  }
  if (best === -1) throw new Error('No legal moves')
  return best
}

function easyMove(board: Board, rng: () => number): number {
  if (rng() < EASY_SMART_RATE) {
    const smart = findWinningMove(board, BOT_MARK) ?? findWinningMove(board, PLAYER_MARK)
    if (smart !== null) return smart
  }
  return randomMove(board, rng)
}

function hardMove(board: Board, rng: () => number, mistakeRate: number): number {
  return rng() < mistakeRate ? randomMove(board, rng) : minimaxMove(board)
}

/** Chooses the bot's (O) cell index. Throws if the board has no legal move. */
export function chooseMove(board: Board, difficulty: Difficulty, opts: BotOptions = {}): number {
  const rng = opts.rng ?? Math.random
  return difficulty === 'easy'
    ? easyMove(board, rng)
    : hardMove(board, rng, resolveMistakeRate(opts.hardMistakeRate))
}
