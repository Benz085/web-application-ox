import type { Page, Route } from '@playwright/test'
import type { AdminPlayer, Board, Difficulty, Game, GameStatus, LeaderboardEntry, Profile } from '../../shared/types.ts'

/** Stateful in-memory stand-in for the `/api/*` backend (contract: plan.md "API contract"). */

export type Endpoint = 'me' | 'current' | 'start' | 'move' | 'abandon' | 'leaderboard' | 'admin'

/** `abort` = network failure; otherwise an HTTP error with the standard error body. */
export type Failure = 'abort' | { status: number; code?: string; message?: string }

export interface RecordedRequest {
  endpoint: Endpoint
  method: string
  body: unknown
}

const ROUTES: Record<string, Endpoint> = {
  'GET /api/me': 'me',
  'GET /api/game/current': 'current',
  'POST /api/game/start': 'start',
  'POST /api/game/move': 'move',
  'POST /api/game/abandon': 'abandon',
  'GET /api/leaderboard': 'leaderboard',
  'GET /api/admin/players': 'admin',
}

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export const ADMIN_UID = 'e2e-admin'

export function emptyBoard(): Board {
  return Array.from({ length: 9 }, () => null)
}

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    displayName: 'Alex Morgan',
    photoURL: null,
    score: 0,
    streak: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    ...overrides,
  }
}

function hasLine(board: Board, mark: 'X' | 'O'): boolean {
  return LINES.some((line) => line.every((i) => board[i] === mark))
}

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}

function errorBody(status: number, code?: string, message?: string) {
  return { error: { code: code ?? `HTTP_${status}`, message: message ?? `Mock error ${status}` } }
}

export class MockApi {
  profile: Profile = makeProfile()
  game: Game | null = null
  leaderboard: LeaderboardEntry[] = []
  adminPlayers: AdminPlayer[] = []
  /** Cells the bot plays next (in order). Falls back to the first empty cell. */
  botMoves: number[] = []
  /** Force `isAdmin` in `/api/me` regardless of the token (simulates a valid non-admin account). */
  meIsAdmin: boolean | null = null
  readonly requests: RecordedRequest[] = []

  private failures = new Map<Endpoint, Failure>()
  private holds = new Map<Endpoint, Promise<void>>()
  private gameCounter = 0

  async install(page: Page): Promise<void> {
    await page.route((url) => url.pathname.startsWith('/api/'), (route) => this.handle(route))
  }

  /** Persistent failure for an endpoint until `fail(endpoint, null)`. */
  fail(endpoint: Endpoint, failure: Failure | null): void {
    if (failure === null) this.failures.delete(endpoint)
    else this.failures.set(endpoint, failure)
  }

  /** Holds responses of an endpoint until the returned function is called. No timers involved. */
  hold(endpoint: Endpoint): () => void {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = () => {
        if (this.holds.get(endpoint) === gate) this.holds.delete(endpoint)
        resolve()
      }
    })
    this.holds.set(endpoint, gate)
    return release
  }

  count(endpoint: Endpoint): number {
    return this.requests.filter((r) => r.endpoint === endpoint).length
  }

  bodies(endpoint: Endpoint): unknown[] {
    return this.requests.filter((r) => r.endpoint === endpoint).map((r) => r.body)
  }

  /** Unfinished game on the server, e.g. `seedGame({ board, difficulty: 'hard' })`. */
  seedGame(options: { board: Board; difficulty?: Difficulty }): Game {
    this.game = {
      id: this.nextGameId(),
      difficulty: options.difficulty ?? 'easy',
      board: [...options.board],
      status: 'in_progress',
    }
    return this.game
  }

  private nextGameId(): string {
    this.gameCounter += 1
    return `game-${this.gameCounter}`
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const endpoint = ROUTES[`${request.method()} ${path}`]
    if (!endpoint) {
      await json(route, 404, errorBody(404, 'NOT_FOUND', `No mock for ${request.method()} ${path}`))
      return
    }
    let body: unknown = null
    const raw = request.postData()
    if (raw) {
      try {
        body = JSON.parse(raw)
      } catch {
        body = raw
      }
    }
    this.requests.push({ endpoint, method: request.method(), body })

    const hold = this.holds.get(endpoint)
    if (hold) await hold

    const failure = this.failures.get(endpoint)
    if (failure === 'abort') {
      await route.abort('failed')
      return
    }
    if (failure) {
      await json(route, failure.status, errorBody(failure.status, failure.code, failure.message))
      return
    }

    const auth = request.headers()['authorization'] ?? ''
    const match = /^Bearer e2e-token-(.+)$/.exec(auth)
    if (!match) {
      await json(route, 401, errorBody(401, 'UNAUTHENTICATED', 'Missing or invalid token'))
      return
    }
    const isAdminToken = match[1] === ADMIN_UID

    switch (endpoint) {
      case 'me': {
        const isAdmin = this.meIsAdmin ?? isAdminToken
        await json(route, 200, { profile: isAdminToken && isAdmin ? null : { ...this.profile }, isAdmin })
        return
      }
      case 'leaderboard':
        await json(route, 200, { players: this.leaderboard })
        return
      case 'admin':
        if (!isAdminToken) await json(route, 403, errorBody(403, 'FORBIDDEN', 'Admins only'))
        else await json(route, 200, { players: this.adminPlayers })
        return
      default:
        break
    }

    if (isAdminToken) {
      await json(route, 403, errorBody(403, 'ADMIN_ACCOUNT', 'Admin accounts cannot play'))
      return
    }
    await this.handleGame(route, endpoint, body)
  }

  private async handleGame(route: Route, endpoint: Endpoint, body: unknown): Promise<void> {
    const input = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
    const active = this.game && this.game.status === 'in_progress' ? this.game : null

    if (endpoint === 'current') {
      await json(route, 200, { game: active ? structuredClone(active) : null })
      return
    }

    if (endpoint === 'start') {
      if (active) {
        await json(route, 409, errorBody(409, 'GAME_IN_PROGRESS', 'A game is already in progress'))
        return
      }
      if (input.difficulty !== 'easy' && input.difficulty !== 'hard') {
        await json(route, 400, errorBody(400, 'BAD_REQUEST', 'Invalid difficulty'))
        return
      }
      this.game = {
        id: this.nextGameId(),
        difficulty: input.difficulty,
        board: emptyBoard(),
        status: 'in_progress',
      }
      await json(route, 201, { game: structuredClone(this.game) })
      return
    }

    if (endpoint === 'abandon') {
      if (!active || active.id !== input.gameId) {
        await json(route, 404, errorBody(404, 'NOT_FOUND', 'No such game'))
        return
      }
      this.finish(active, 'lost')
      await json(route, 200, { game: structuredClone(active) })
      return
    }

    // move
    const cell = input.cell
    if (!active || active.id !== input.gameId) {
      await json(route, 404, errorBody(404, 'NOT_FOUND', 'No such game'))
      return
    }
    if (typeof cell !== 'number' || !Number.isInteger(cell) || cell < 0 || cell > 8 || active.board[cell] !== null) {
      await json(route, 400, errorBody(400, 'INVALID_MOVE', 'Invalid move'))
      return
    }
    active.board[cell] = 'X'
    if (hasLine(active.board, 'X')) this.finish(active, 'won')
    else if (active.board.every((c) => c !== null)) this.finish(active, 'draw')
    else {
      const bot = this.pickBotCell(active.board)
      active.board[bot] = 'O'
      if (hasLine(active.board, 'O')) this.finish(active, 'lost')
      else if (active.board.every((c) => c !== null)) this.finish(active, 'draw')
    }
    await json(route, 200, { game: structuredClone(active), profile: { ...this.profile } })
  }

  private pickBotCell(board: Board): number {
    while (this.botMoves.length > 0) {
      const next = this.botMoves.shift()!
      if (board[next] === null) return next
    }
    return board.findIndex((c) => c === null)
  }

  /** Scoring rules: win +1, loss -1, draw 0, third win in a row +2 and streak back to 0. */
  private finish(game: Game, status: Exclude<GameStatus, 'in_progress'>): void {
    const p = this.profile
    let scoreDelta = 0
    let bonus = false
    if (status === 'won') {
      p.wins += 1
      p.streak += 1
      scoreDelta = 1
      if (p.streak === 3) {
        scoreDelta = 2
        bonus = true
        p.streak = 0
      }
    } else if (status === 'lost') {
      p.losses += 1
      p.streak = 0
      scoreDelta = -1
    } else {
      p.draws += 1
      p.streak = 0
    }
    p.score += scoreDelta
    game.status = status
    game.result = { scoreDelta, bonus }
  }
}
