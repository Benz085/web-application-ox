import '@/web-app-ox/test/setup'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ADMIN, SIGNED_OUT, renderAt } from '@/web-app-ox/test/render'
import { AuthError } from '@/web-app-ox/auth/AuthStatus'
import RequireAdmin from '@/web-app-ox/auth/RequireAdmin'
import RequireAuth from '@/web-app-ox/auth/RequireAuth'
import type { AuthContextValue } from '@/web-app-ox/auth/authContextValue'

function playerRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<p>login page</p>} />
      <Route path="/login/admin" element={<p>admin login page</p>} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<p>game page</p>} />
        <Route path="/leaderboard" element={<p>leaderboard page</p>} />
        <Route path="/admin" element={<p>admin page via RequireAuth</p>} />
      </Route>
    </Routes>
  )
}

function adminRoutes() {
  return (
    <Routes>
      <Route path="/login/admin" element={<p>admin login page</p>} />
      <Route element={<RequireAdmin />}>
        <Route path="/admin" element={<p>admin page</p>} />
      </Route>
    </Routes>
  )
}

describe('RequireAuth (AC-1, AC-3)', () => {
  it.each(['/', '/leaderboard'])('redirects a logged-out user from %s to /login', (route) => {
    renderAt(playerRoutes(), { route, auth: SIGNED_OUT })
    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
  })

  it('shows the loading state while auth is resolving and renders no page', () => {
    renderAt(playerRoutes(), { route: '/', auth: { loading: true } })
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.queryByText('game page')).not.toBeInTheDocument()
  })

  it('does not redirect while loading even when the user is not known yet', () => {
    renderAt(playerRoutes(), { route: '/', auth: { ...SIGNED_OUT, loading: true } })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/')
    expect(screen.queryByText('login page')).not.toBeInTheDocument()
  })

  it('renders the page for a signed-in player', () => {
    renderAt(playerRoutes(), { route: '/', auth: {} })
    expect(screen.getByText('game page')).toBeInTheDocument()
  })

  it('redirects a signed-in admin at "/" to /admin', () => {
    renderAt(playerRoutes(), { route: '/', auth: ADMIN })
    expect(screen.getByTestId('location')).toHaveTextContent('/admin')
    expect(screen.getByText('admin page via RequireAuth')).toBeInTheDocument()
  })

  it('lets a signed-in admin open /leaderboard', () => {
    renderAt(playerRoutes(), { route: '/leaderboard', auth: ADMIN })
    expect(screen.getByText('leaderboard page')).toBeInTheDocument()
  })

  it('shows the account error state with retry and sign out', async () => {
    const auth: Partial<AuthContextValue> = { error: new Error('profile exploded') }
    const view = renderAt(playerRoutes(), { route: '/', auth })
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load your account')
    expect(screen.getByRole('alert')).toHaveTextContent('profile exploded')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(view.auth.refresh).toHaveBeenCalledTimes(1)
    expect(view.auth.signOut).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('game page')).not.toBeInTheDocument()
  })
})

describe('RequireAdmin (AC-1, AC-20)', () => {
  it('redirects a logged-out user from /admin to /login/admin', () => {
    renderAt(adminRoutes(), { route: '/admin', auth: SIGNED_OUT })
    expect(screen.getByText('admin login page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login/admin')
  })

  it('shows the loading state while auth is resolving', () => {
    renderAt(adminRoutes(), { route: '/admin', auth: { ...SIGNED_OUT, loading: true } })
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.queryByText('admin login page')).not.toBeInTheDocument()
  })

  it('shows the not-authorized state to a signed-in non-admin', () => {
    renderAt(adminRoutes(), { route: '/admin', auth: { isAdmin: false } })
    expect(screen.getByRole('heading', { name: 'Not authorized' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Play' })).toHaveAttribute('href', '/')
    expect(screen.queryByText('admin page')).not.toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/admin')
  })

  it('renders the page for an admin', () => {
    renderAt(adminRoutes(), { route: '/admin', auth: ADMIN })
    expect(screen.getByText('admin page')).toBeInTheDocument()
  })

  it('shows the account error state instead of not-authorized when /api/me failed', () => {
    renderAt(adminRoutes(), { route: '/admin', auth: { error: new Error('x') } })
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load your account')
    expect(screen.queryByRole('heading', { name: 'Not authorized' })).not.toBeInTheDocument()
  })
})

describe('AuthError fallback message', () => {
  it('uses a generic message when there is no error object', () => {
    renderAt(<AuthError />, { auth: { error: null } })
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
  })
})
