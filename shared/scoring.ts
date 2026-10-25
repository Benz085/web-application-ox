import type { GameOutcome, GameResult } from './types.js'

export interface Stats {
  score: number
  streak: number
  wins: number
  losses: number
  draws: number
}

export const STREAK_BONUS_AT = 3

export function apply(stats: Stats, result: GameOutcome): { stats: Stats; result: GameResult } {
  if (result === 'win') {
    const streak = stats.streak + 1
    const bonus = streak === STREAK_BONUS_AT
    const scoreDelta = bonus ? 2 : 1
    return {
      stats: {
        ...stats,
        score: stats.score + scoreDelta,
        streak: bonus ? 0 : streak,
        wins: stats.wins + 1,
      },
      result: { scoreDelta, bonus },
    }
  }
  if (result === 'loss') {
    return {
      stats: { ...stats, score: stats.score - 1, streak: 0, losses: stats.losses + 1 },
      result: { scoreDelta: -1, bonus: false },
    }
  }
  return {
    stats: { ...stats, streak: 0, draws: stats.draws + 1 },
    result: { scoreDelta: 0, bonus: false },
  }
}
