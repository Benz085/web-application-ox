import '@/web-app-ox/test/setup'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { deferred } from '@/web-app-ox/test/fixtures'
import { ADMIN, SIGNED_OUT, renderAt } from '@/web-app-ox/test/render'
import type { AuthContextValue } from '@/web-app-ox/auth/authContextValue'
import LoginAdminPage from '@/web-app-ox/features/login-admin/LoginAdminPage'

function setup(auth: Partial<AuthContextValue> = {}) {
  return renderAt(<LoginAdminPage />, { route: '/login/admin', auth: { ...SIGNED_OUT, ...auth } })
}

const email = () => screen.getByLabelText('Email')
const password = () => screen.getByLabelText('Password')
const submit = () => screen.getByRole('button', { name: /^Sign in|Signing in/ })

async function fillAndSubmit(e = 'adminox@gmail.com', p = 'secret') {
  await userEvent.type(email(), e)
  await userEvent.type(password(), p)
  await userEvent.click(submit())
}

describe('LoginAdminPage default (UI-10, AC-29)', () => {
  it('has labelled email and password fields and a submit button', () => {
    setup()
    expect(screen.getByRole('heading', { level: 1, name: 'Admin sign in' })).toBeInTheDocument()
    expect(email()).toHaveAttribute('type', 'email')
    expect(email()).toBeRequired()
    expect(password()).toHaveAttribute('type', 'password')
    expect(password()).toBeRequired()
    expect(submit()).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('offers no Google, sign-up, reset or back link', () => {
    const { container } = setup()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    const text = container.textContent?.toLowerCase() ?? ''
    expect(text).not.toContain('google')
    expect(text).not.toContain('sign up')
    expect(text).not.toContain('forgot')
    expect(text).not.toContain('reset')
    expect(text).not.toContain('back to')
  })
})

describe('show / hide password', () => {
  it('toggles the field type and aria-pressed', async () => {
    setup()
    const toggle = screen.getByRole('button', { name: 'Show password' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    expect(password()).toHaveAttribute('type', 'text')
    const hide = screen.getByRole('button', { name: 'Hide password' })
    expect(hide).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(hide)
    expect(password()).toHaveAttribute('type', 'password')
  })
})

describe('submit', () => {
  it('signs in with the trimmed email and navigates to /admin on success (AC-25)', async () => {
    const view = setup()
    await fillAndSubmit('  adminox@gmail.com  ', 'pw1')
    expect(view.auth.signInWithEmail).toHaveBeenCalledExactlyOnceWith('adminox@gmail.com', 'pw1')
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/admin'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows loading: button disabled + aria-busy, fields read-only, toggle disabled (AC-26)', async () => {
    const gate = deferred<boolean>()
    setup({ signInWithEmail: vi.fn(() => gate.promise) })
    await fillAndSubmit()
    const busy = screen.getByRole('button', { name: 'Signing in…' })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(email()).toHaveAttribute('readonly')
    expect(password()).toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: 'Show password' })).toBeDisabled()
    await act(async () => gate.resolve(true))
  })

  it('ignores a second submit while busy', async () => {
    const gate = deferred<boolean>()
    const view = setup({ signInWithEmail: vi.fn(() => gate.promise) })
    await fillAndSubmit()
    // a programmatic submit (e.g. a script or autofill) while busy must not call the API again
    fireEvent.submit(screen.getByRole('button', { name: 'Signing in…' }).closest('form') as HTMLFormElement)
    expect(view.auth.signInWithEmail).toHaveBeenCalledTimes(1)
    await act(async () => gate.resolve(true))
  })
})

describe('errors (AC-26, AC-27)', () => {
  it.each(['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-email'])(
    'shows the generic message for %s',
    async (code) => {
      setup({ signInWithEmail: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { code })) })
      await fillAndSubmit()
      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Invalid email or password.')
      expect(alert).toHaveTextContent('Sign-in failed')
    },
  )

  it('shows the same generic message when signInWithEmail resolves false (non-admin)', async () => {
    setup({ signInWithEmail: vi.fn().mockResolvedValue(false) })
    await fillAndSubmit('user@example.test', 'right-password')
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
    expect(screen.getByTestId('location')).toHaveTextContent('/login/admin')
  })

  it('shows the too-many-requests message', async () => {
    setup({
      signInWithEmail: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { code: 'auth/too-many-requests' })),
    })
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts. Try again later.')
  })

  it.each([
    ['another code', Object.assign(new Error('x'), { code: 'auth/network-request-failed' })],
    ['no code', new Error('x')],
    ['a string', 'boom'],
    ['null', null],
    ['a non-string code', { code: 7 }],
  ])('shows the server message for %s', async (_name, cause) => {
    setup({ signInWithEmail: vi.fn().mockRejectedValue(cause) })
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reach the server. Try again.")
  })

  it('keeps the email, clears the password, hides it and focuses the password field', async () => {
    setup({ signInWithEmail: vi.fn().mockResolvedValue(false) })
    await userEvent.type(email(), 'adminox@gmail.com')
    await userEvent.type(password(), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    await userEvent.click(submit())
    await screen.findByRole('alert')
    expect(email()).toHaveValue('adminox@gmail.com')
    expect(password()).toHaveValue('')
    expect(password()).toHaveAttribute('type', 'password')
    expect(submit()).toBeEnabled()
    await waitFor(() => expect(password()).toHaveFocus())
  })

  it('clears the old alert on the next attempt', async () => {
    const signInWithEmail = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    setup({ signInWithEmail })
    await fillAndSubmit()
    await screen.findByRole('alert')
    await userEvent.type(password(), 'again')
    await userEvent.click(submit())
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})

describe('session states', () => {
  it('shows the session check while auth resolves', () => {
    setup({ loading: true })
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session…')
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('keeps the form (not the session check) when auth starts loading mid sign-in', async () => {
    const gate = deferred<boolean>()
    const view = setup({ signInWithEmail: vi.fn(() => gate.promise) })
    await fillAndSubmit()
    view.setAuth({ loading: true })
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeInTheDocument()
    await act(async () => gate.resolve(true))
  })

  it('redirects a signed-in admin to /admin', () => {
    renderAt(<LoginAdminPage />, { route: '/login/admin', auth: ADMIN })
    expect(screen.getByTestId('location')).toHaveTextContent('/admin')
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('still shows the form to a signed-in non-admin', () => {
    renderAt(<LoginAdminPage />, { route: '/login/admin' })
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login/admin')
  })
})
