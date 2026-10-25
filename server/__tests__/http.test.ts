import { describe, expect, it, vi } from 'vitest'
import {
  HttpError, assertMethod, errorBody, parseBody, parseCell, parseDifficulty, parseGameId, respond,
} from '../http.js'
import type { ResLike } from '../http.js'

function fakeRes() {
  const out = { code: 0, body: undefined as unknown, headers: {} as Record<string, string> }
  const res: ResLike = {
    status(code) {
      out.code = code
      return { json: (b) => void (out.body = b) }
    },
    setHeader(n, v) {
      out.headers[n] = v
    },
  }
  return { res, out }
}

const thrown = (fn: () => unknown): HttpError => {
  try {
    fn()
  } catch (e) {
    return e as HttpError
  }
  throw new Error('expected throw')
}

describe('assertMethod', () => {
  it('passes for matching method', () => {
    expect(() => assertMethod({ method: 'GET', headers: {} }, 'GET')).not.toThrow()
  })
  it('405 METHOD_NOT_ALLOWED otherwise (including missing method)', () => {
    for (const method of ['POST', 'PUT', 'DELETE', undefined]) {
      const e = thrown(() => assertMethod({ method, headers: {} }, 'GET'))
      expect([e.status, e.code]).toEqual([405, 'METHOD_NOT_ALLOWED'])
    }
  })
})

describe('respond', () => {
  it('writes the body with default 200 and custom status', async () => {
    const a = fakeRes()
    await respond(a.res, async () => ({ body: { ok: 1 } }))
    expect([a.out.code, a.out.body]).toEqual([200, { ok: 1 }])
    const b = fakeRes()
    await respond(b.res, async () => ({ status: 201, body: { ok: 2 } }))
    expect(b.out.code).toBe(201)
  })

  it('maps HttpError to the error JSON shape', async () => {
    const { res, out } = fakeRes()
    await respond(res, async () => {
      throw new HttpError(409, 'GAME_IN_PROGRESS', 'busy')
    })
    expect(out.code).toBe(409)
    expect(out.body).toEqual(errorBody('GAME_IN_PROGRESS', 'busy'))
    expect(out.body).toEqual({ error: { code: 'GAME_IN_PROGRESS', message: 'busy' } })
  })

  it('sets the Allow header for 405', async () => {
    const { res, out } = fakeRes()
    await respond(res, async () => {
      assertMethod({ method: 'GET', headers: {} }, 'POST')
      return { body: null }
    })
    expect(out.code).toBe(405)
    expect(out.headers.Allow).toBe('POST')
  })

  it('unknown errors become 500 without leaking details', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { res, out } = fakeRes()
    await respond(res, async () => {
      throw new Error('secret db password hunter2 user@example.test')
    })
    expect(out.code).toBe(500)
    expect(out.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
    expect(JSON.stringify(out.body)).not.toContain('hunter2')
    expect(JSON.stringify(spy.mock.calls)).not.toContain('hunter2')
    expect(JSON.stringify(spy.mock.calls)).not.toContain('user@example.test')

    const other = fakeRes()
    await respond(other.res, async () => {
      throw 'a string'
    })
    expect(other.out.code).toBe(500)
    expect(JSON.stringify(spy.mock.calls)).toContain('unknown')
    spy.mockRestore()
  })
})

describe('parseBody', () => {
  it('accepts objects and JSON strings', () => {
    expect(parseBody({ headers: {}, body: { a: 1 } })).toEqual({ a: 1 })
    expect(parseBody({ headers: {}, body: '{"a":2}' })).toEqual({ a: 2 })
  })
  it('400 INVALID_BODY for invalid JSON, non-object, array, null, missing', () => {
    for (const body of ['{oops', '"str"', '[1]', 'null', null, undefined, 5, [1]]) {
      const e = thrown(() => parseBody({ headers: {}, body }))
      expect([e.status, e.code]).toEqual([400, 'INVALID_BODY'])
    }
  })
})

describe('field validation', () => {
  it('parseDifficulty accepts easy/hard only', () => {
    expect(parseDifficulty({ difficulty: 'easy' })).toBe('easy')
    expect(parseDifficulty({ difficulty: 'hard' })).toBe('hard')
    for (const v of ['medium', 'EASY', '', 1, null, undefined]) {
      expect(thrown(() => parseDifficulty({ difficulty: v })).code).toBe('INVALID_DIFFICULTY')
    }
  })
  it('parseCell accepts integers 0..8 only', () => {
    for (const c of [0, 4, 8]) expect(parseCell({ cell: c })).toBe(c)
    for (const v of [-1, 9, 1.5, NaN, Infinity, '3', null, undefined, true]) {
      const e = thrown(() => parseCell({ cell: v }))
      expect([e.status, e.code]).toEqual([400, 'INVALID_CELL'])
    }
  })
  it('parseGameId accepts a plain non-empty string', () => {
    expect(parseGameId({ gameId: 'abc123' })).toBe('abc123')
    expect(parseGameId({ gameId: 'a'.repeat(128) })).toHaveLength(128)
    for (const v of ['', '   ', 'a/b', 'a'.repeat(129), 5, null, undefined, {}]) {
      const e = thrown(() => parseGameId({ gameId: v }))
      expect([e.status, e.code]).toEqual([400, 'INVALID_GAME_ID'])
    }
  })
})
