import '@/web-app-ox/test/setup'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch, apiGet, apiPost } from '@/web-app-ox/api/client'

const getIdToken = vi.fn<() => Promise<string | null>>()

vi.mock('@/web-app-ox/auth/authModule', () => ({
  loadAuth: () => Promise.resolve({ getIdToken }),
}))

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  getIdToken.mockReset().mockResolvedValue('tok-123')
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('apiFetch', () => {
  it('sends the Bearer token and returns the parsed JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))
    await expect(apiFetch('/api/me')).resolves.toEqual({ ok: true })
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/me')
    expect(init?.method).toBe('GET')
    expect(init?.headers).toEqual({ Accept: 'application/json', Authorization: 'Bearer tok-123' })
    expect(init?.body).toBeUndefined()
  })

  it('omits Authorization when there is no token', async () => {
    getIdToken.mockResolvedValue(null)
    fetchMock.mockResolvedValue(jsonResponse({}))
    await apiFetch('/api/me')
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({ Accept: 'application/json' })
  })

  it('serialises a body as JSON with a Content-Type header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await apiFetch('/api/game/move', { method: 'POST', body: { gameId: 'g', cell: 4 } })
    const init = fetchMock.mock.calls[0][1]
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(JSON.stringify({ gameId: 'g', cell: 4 }))
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' })
  })

  it('passes the abort signal to fetch', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    const controller = new AbortController()
    await apiFetch('/api/me', { signal: controller.signal })
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal)
  })

  it('returns null for a successful response without a JSON body', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }))
    await expect(apiFetch('/api/x')).resolves.toBeNull()
  })

  it('turns a JSON error body into an ApiError with status, code and message', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'ADMIN_ACCOUNT', message: 'Admins cannot play' } }, 403))
    const error = await apiFetch('/api/game/start').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      name: 'ApiError',
      status: 403,
      code: 'ADMIN_ACCOUNT',
      message: 'Admins cannot play',
    })
  })

  it.each([
    ['not JSON', new Response('<html>oops</html>', { status: 502 })],
    ['null body', jsonResponse(null, 502)],
    ['a string', jsonResponse('bad', 502)],
    ['no error key', jsonResponse({ message: 'x' }, 502)],
    ['error is a string', jsonResponse({ error: 'x' }, 502)],
    ['error is null', jsonResponse({ error: null }, 502)],
    ['error without code', jsonResponse({ error: { message: 'm' } }, 502)],
    ['error without message', jsonResponse({ error: { code: 'c' } }, 502)],
    ['non-string code', jsonResponse({ error: { code: 1, message: 'm' } }, 502)],
    ['non-string message', jsonResponse({ error: { code: 'c', message: 2 } }, 502)],
  ])('falls back to HTTP_ERROR when the error body is %s', async (_name, response) => {
    fetchMock.mockResolvedValue(response)
    await expect(apiFetch('/api/x')).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      code: 'HTTP_ERROR',
      message: 'Request failed (502).',
    })
  })

  it('maps a network failure to ApiError NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(apiFetch('/api/x')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Network error. Check your connection and try again.',
    })
  })

  it('re-throws an AbortError unchanged', async () => {
    const abort = new DOMException('aborted', 'AbortError')
    fetchMock.mockRejectedValue(abort)
    await expect(apiFetch('/api/x')).rejects.toBe(abort)
  })

  it('treats a non-abort DOMException as a network error', async () => {
    fetchMock.mockRejectedValue(new DOMException('nope', 'NetworkError'))
    await expect(apiFetch('/api/x')).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })
})

describe('apiGet / apiPost', () => {
  it('apiGet issues a GET with the signal', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ a: 1 }))
    const controller = new AbortController()
    await expect(apiGet('/api/leaderboard', controller.signal)).resolves.toEqual({ a: 1 })
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET')
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal)
  })

  it('apiPost issues a POST with the given body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await apiPost('/api/game/start', { difficulty: 'hard' })
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST')
    expect(fetchMock.mock.calls[0][1]?.body).toBe('{"difficulty":"hard"}')
  })

  it('apiPost defaults the body to an empty object', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await apiPost('/api/game/abandon')
    expect(fetchMock.mock.calls[0][1]?.body).toBe('{}')
  })
})
