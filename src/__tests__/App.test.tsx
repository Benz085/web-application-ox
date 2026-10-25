import '@/web-app-ox/test/setup'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AuthModule } from '@/web-app-ox/auth/types'
import App from '@/web-app-ox/App'

const fakeAuth: AuthModule = {
  signInWithGoogle: vi.fn(),
  signInWithEmail: vi.fn(),
  signOutUser: vi.fn(),
  subscribe: vi.fn((cb) => {
    cb(null)
    return () => undefined
  }),
  getIdToken: vi.fn(),
}
vi.mock('@/web-app-ox/auth/authModule', () => ({ loadAuth: () => Promise.resolve(fakeAuth) }))

describe('App', () => {
  it('wires router + auth provider: a logged-out visitor lands on the login page', async () => {
    window.history.replaceState(null, '', '/')
    render(<App />)
    expect(await screen.findByRole('button', { name: /Sign in with Google/ })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })
})
