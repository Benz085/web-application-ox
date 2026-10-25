import '@/web-app-ox/test/setup'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { deferred } from '@/web-app-ox/test/fixtures'
import { ADMIN, SIGNED_OUT, renderAt } from '@/web-app-ox/test/render'
import LoginPage from '@/web-app-ox/features/login/LoginPage'

const signedOut = (extra: Parameters<typeof renderAt>[1] = {}) =>
  renderAt(<LoginPage />, { route: '/login', ...extra, auth: { ...SIGNED_OUT, ...extra.auth } })

const button = () => screen.getByRole('button', { name: /Sign in with Google/ })

describe('LoginPage default (UI-1, AC-29)', () => {
  it('shows the Google button and the intro text', () => {
    signedOut()
    expect(screen.getByRole('heading', { level: 1, name: 'OX Game' })).toBeInTheDocument()
    expect(button()).toBeEnabled()
    expect(screen.getByText('Only Google accounts are supported.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('has no email/password form and no link to /login/admin', () => {
    const { container } = signedOut()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(container.querySelector('input')).toBeNull()
    expect(container.querySelector('form')).toBeNull()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(container.innerHTML).not.toContain('/login/admin')
    expect(container.textContent?.toLowerCase()).not.toContain('admin')
  })

  it('calls signInWithGoogle on click', async () => {
    const view = signedOut()
    await userEvent.click(button())
    expect(view.auth.signInWithGoogle).toHaveBeenCalledTimes(1)
  })
})

describe('LoginPage loading', () => {
  it('shows the session check while auth resolves', () => {
    signedOut({ auth: { loading: true } })
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session…')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows busy state during the popup: disabled, aria-busy, note', async () => {
    const gate = deferred<void>()
    const view = signedOut({ auth: { signInWithGoogle: vi.fn(() => gate.promise) } })
    await userEvent.click(button())
    const busy = screen.getByRole('button', { name: 'Signing in…' })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Finish signing in with Google in the popup window.')
    expect(screen.queryByText('Only Google accounts are supported.')).not.toBeInTheDocument()
    await act(async () => gate.resolve())
    expect(view.auth.signInWithGoogle).toHaveBeenCalledTimes(1)
    expect(button()).toBeEnabled()
  })

  it('keeps the busy button (not the session check) when auth starts loading mid sign-in', async () => {
    const gate = deferred<void>()
    const view = signedOut({ auth: { signInWithGoogle: vi.fn(() => gate.promise) } })
    await userEvent.click(button())
    view.setAuth({ loading: true })
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeInTheDocument()
    expect(screen.queryByText('Checking your session…')).not.toBeInTheDocument()
    await act(async () => gate.resolve())
  })
})

describe('LoginPage errors (role="alert")', () => {
  it.each(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])(
    'shows the cancelled message for %s',
    async (code) => {
      signedOut({ auth: { signInWithGoogle: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { code })) } })
      await userEvent.click(button())
      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Sign-in failed')
      expect(alert).toHaveTextContent('Sign-in was cancelled. Please try again.')
      expect(button()).toBeEnabled()
    },
  )

  it.each([
    ['an error with another code', Object.assign(new Error('x'), { code: 'auth/network-request-failed' })],
    ['an error without code', new Error('x')],
    ['a non-object', 'boom'],
    ['null', null],
    ['a non-string code', { code: 42 }],
  ])('shows the generic message for %s', async (_name, cause) => {
    signedOut({ auth: { signInWithGoogle: vi.fn().mockRejectedValue(cause) } })
    await userEvent.click(button())
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
  })

  it('clears the previous error when retrying', async () => {
    const signInWithGoogle = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(undefined)
    signedOut({ auth: { signInWithGoogle } })
    await userEvent.click(button())
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    await userEvent.click(button())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('LoginPage redirects when signed in', () => {
  it('sends a player to /', () => {
    renderAt(<LoginPage />, { route: '/login' })
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('sends an admin to /admin', () => {
    renderAt(<LoginPage />, { route: '/login', auth: ADMIN })
    expect(screen.getByTestId('location')).toHaveTextContent('/admin')
  })

  it('does not redirect while still loading', () => {
    renderAt(<LoginPage />, { route: '/login', auth: { loading: true } })
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
  })
})
