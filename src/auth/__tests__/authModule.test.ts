import '@/web-app-ox/test/setup'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/web-app-ox/auth/e2eAuth', () => ({ kind: 'e2e' }))
vi.mock('@/web-app-ox/auth/firebase', () => ({ kind: 'firebase' }))

beforeEach(() => {
  vi.resetModules()
})

describe('loadAuth', () => {
  it('loads the Firebase module by default', async () => {
    vi.stubEnv('VITE_E2E', '')
    const { loadAuth } = await import('@/web-app-ox/auth/authModule')
    await expect(loadAuth()).resolves.toMatchObject({ kind: 'firebase' })
  })

  it('loads the fake e2e module when VITE_E2E is "true"', async () => {
    vi.stubEnv('VITE_E2E', 'true')
    const { loadAuth } = await import('@/web-app-ox/auth/authModule')
    await expect(loadAuth()).resolves.toMatchObject({ kind: 'e2e' })
  })

  it('only treats the exact string "true" as the e2e flag', async () => {
    vi.stubEnv('VITE_E2E', 'yes')
    const { loadAuth } = await import('@/web-app-ox/auth/authModule')
    await expect(loadAuth()).resolves.toMatchObject({ kind: 'firebase' })
  })

  it('caches the module promise', async () => {
    vi.stubEnv('VITE_E2E', '')
    const { loadAuth } = await import('@/web-app-ox/auth/authModule')
    expect(loadAuth()).toBe(loadAuth())
  })
})
