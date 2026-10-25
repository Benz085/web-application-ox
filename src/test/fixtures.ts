import type { Profile } from '@/web-app-ox/api/types'
import type { AdminPlayer, Board, Difficulty, Game, GameStatus, LeaderboardEntry } from '../../shared/types'

/** 'XO.......' -> board; 'X' / 'O' are marks, anything else is an empty cell. */
export function board(pattern: string): Board {
  return Array.from({ length: 9 }, (_, i) => {
    const c = pattern[i]
    return c === 'X' || c === 'O' ? c : null
  })
}

export function makeGame(overrides: Partial<Game> & { cells?: string } = {}): Game {
  const { cells, ...rest } = overrides
  return {
    id: 'game-1',
    difficulty: 'easy' as Difficulty,
    board: board(cells ?? ''),
    status: 'in_progress' as GameStatus,
    ...rest,
  }
}

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    displayName: 'Alex Morgan',
    photoURL: null,
    score: 4,
    streak: 1,
    wins: 6,
    losses: 2,
    draws: 1,
    ...overrides,
  }
}

export function makeEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    rank: 1,
    isYou: false,
    displayName: 'Sam Rivers',
    photoURL: null,
    score: 10,
    wins: 12,
    losses: 2,
    draws: 0,
    ...overrides,
  }
}

export function makeAdminPlayer(overrides: Partial<AdminPlayer> = {}): AdminPlayer {
  return {
    uid: 'u1',
    displayName: 'Sam Rivers',
    email: 'sam@example.test',
    score: 3,
    streak: 2,
    wins: 4,
    losses: 1,
    draws: 0,
    lastPlayedAt: null,
    ...overrides,
  }
}

export interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
