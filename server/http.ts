import type { ApiError, Difficulty } from '../shared/types.js'

export class HttpError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

export interface ReqLike {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
}

export interface ResLike {
  status(code: number): { json(body: unknown): unknown }
  setHeader(name: string, value: string): unknown
}

export function errorBody(code: string, message: string): ApiError {
  return { error: { code, message } }
}

/** Throws 405 unless the request method is `method`. */
export function assertMethod(req: ReqLike, method: 'GET' | 'POST'): void {
  if (req.method !== method) {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', `Use ${method}`)
  }
}

/**
 * Runs a handler body and converts thrown errors to the JSON error shape.
 * Unknown errors become 500 and never leak details (nor tokens/emails) to the client or logs.
 */
export async function respond(res: ResLike, run: () => Promise<{ status?: number; body: unknown }>): Promise<void> {
  try {
    const out = await run()
    res.status(out.status ?? 200).json(out.body)
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status === 405) res.setHeader('Allow', err.message.replace('Use ', ''))
      res.status(err.status).json(errorBody(err.code, err.message))
      return
    }
    console.error('Unhandled server error', err instanceof Error ? err.name : 'unknown')
    res.status(500).json(errorBody('INTERNAL_ERROR', 'Internal server error'))
  }
}

export function parseBody(req: ReqLike): Record<string, unknown> {
  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      throw new HttpError(400, 'INVALID_BODY', 'Body must be valid JSON')
    }
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError(400, 'INVALID_BODY', 'Body must be a JSON object')
  }
  return body as Record<string, unknown>
}

export function parseDifficulty(body: Record<string, unknown>): Difficulty {
  const v = body.difficulty
  if (v === 'easy' || v === 'hard') return v
  throw new HttpError(400, 'INVALID_DIFFICULTY', 'difficulty must be "easy" or "hard"')
}

export function parseCell(body: Record<string, unknown>): number {
  const v = body.cell
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 8) return v
  throw new HttpError(400, 'INVALID_CELL', 'cell must be an integer from 0 to 8')
}

export function parseGameId(body: Record<string, unknown>): string {
  const v = body.gameId
  if (typeof v === 'string' && v.trim() !== '' && v.length <= 128 && !v.includes('/')) return v
  throw new HttpError(400, 'INVALID_GAME_ID', 'gameId must be a non-empty string')
}
