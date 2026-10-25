export type Mark = 'X' | 'O'
export type Cell = Mark | null
export type Board = Cell[]
export type Difficulty = 'easy' | 'hard'
export type GameStatus = 'in_progress' | 'won' | 'lost' | 'draw'
export type GameOutcome = 'win' | 'loss' | 'draw'

export interface GameResult {
  scoreDelta: number
  bonus: boolean
}

export interface Game {
  id: string
  difficulty: Difficulty
  board: Board
  status: GameStatus
  result?: GameResult
}

export interface Profile {
  displayName: string
  photoURL: string | null
  score: number
  streak: number
  wins: number
  losses: number
  draws: number
}

export interface LeaderboardEntry {
  rank: number
  /** True for the row of the signed-in viewer (no uid is exposed). */
  isYou: boolean
  displayName: string
  photoURL: string | null
  score: number
  wins: number
  losses: number
  draws: number
}

export interface AdminPlayer {
  uid: string
  displayName: string
  email: string
  score: number
  streak: number
  wins: number
  losses: number
  draws: number
  lastPlayedAt: string | null
}

export interface ApiError {
  error: { code: string; message: string }
}
