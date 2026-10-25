import '@/web-app-ox/test/setup'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthContextValue } from '@/web-app-ox/auth/authContextValue'
import { apiGet } from '@/web-app-ox/api/client'
import { makeProfile } from '@/web-app-ox/test/fixtures'
import { ADMIN, SIGNED_OUT, renderAt } from '@/web-app-ox/test/render'
import AppRoutes from '@/web-app-ox/routes'

vi.mock('@/web-app-ox/api/client', () => ({ apiGet: vi.fn(), apiPost: vi.fn() }))
const mockedGet = vi.mocked(apiGet)

function at(route: string, auth: Partial<AuthContextValue>) {
  return renderAt(<AppRoutes />, { route, auth })
}

beforeEach(() => {
  vi.resetAllMocks()
  mockedGet.mockImplementation((path: string) => {
    if (path === '/api/game/current') return Promise.resolve({ game: null })
    if (path === '/api/leaderboard') return Promise.resolve({ players: [] })
    if (path === '/api/admin/players') return Promise.resolve({ players: [] })
    return Promise.reject(new Error(`unexpected ${path}`))
  })
})

describe('routing (AC-1, AC-20, AC-25, AC-29)', () => {
  it('shows the public player login at /login', () => {
    at('/login', SIGNED_OUT)
    expect(screen.getByRole('button', { name: /Sign in with Google/ })).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('shows the admin login at /login/admin', () => {
    at('/login/admin', SIGNED_OUT)
    expect(screen.getByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument()
  })

  it.each(['/', '/leaderboard'])('logged-out %s -> /login', (route) => {
    at(route, SIGNED_OUT)
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
    expect(screen.getByRole('button', { name: /Sign in with Google/ })).toBeInTheDocument()
  })

  it('logged-out /admin -> /login/admin', () => {
    at('/admin', SIGNED_OUT)
    expect(screen.getByTestId('location')).toHaveTextContent('/login/admin')
    expect(screen.getByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument()
  })

  it('a player gets the game inside the layout with header', async () => {
    at('/', { profile: makeProfile() })
    expect(await screen.findByRole('heading', { name: 'New game' })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('a player can open the leaderboard', async () => {
    at('/leaderboard', {})
    expect(await screen.findByRole('heading', { name: 'Leaderboard' })).toBeInTheDocument()
  })

  it('a signed-in non-admin at /admin sees the not-authorized state, without an Admin nav link', () => {
    at('/admin', {})
    expect(screen.getByRole('heading', { name: 'Not authorized' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  })

  it('a signed-in admin at / goes to /admin and sees the admin page and nav', async () => {
    at('/', ADMIN)
    expect(await screen.findByRole('heading', { name: /Admin/, level: 1 })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/admin')
    expect(screen.queryByRole('link', { name: 'Play' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument()
  })

  it('shows the loading state on guarded routes while auth resolves', () => {
    at('/', { loading: true })
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
  })
})
