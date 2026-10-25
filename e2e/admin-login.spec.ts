import { patchAuth } from './helpers/auth.ts'
import { test, expect } from './helpers/fixtures.ts'
import { gotoAs, expectNoHorizontalScroll } from './helpers/ui.ts'
import { makeProfile } from './helpers/mockApi.ts'

const INVALID = 'Invalid email or password.'

test.describe('S6 admin login', () => {
  test('TC-98 default state: email/password only, no other entry points', async ({ page }) => {
    await gotoAs(page, 'none', '/login/admin')
    await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible()
    await expect(page.getByText('ADMIN', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Show password' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled()
    await expect(page.getByRole('button', { name: /google/i })).toHaveCount(0)
    await expect(page.getByRole('link')).toHaveCount(0)
    await expect(page.getByText(/sign up|forgot|reset|back to|player login/i)).toHaveCount(0)
  })

  test('TC-99 show / hide password toggles input type and does not submit', async ({ page, api }) => {
    await gotoAs(page, 'none', '/login/admin')
    const password = page.getByLabel('Password', { exact: true })
    await expect(password).toHaveAttribute('type', 'password')
    const show = page.getByRole('button', { name: 'Show password' })
    await expect(show).toHaveAttribute('type', 'button')
    await expect(show).toHaveAttribute('aria-pressed', 'false')
    await password.fill('secret')
    await show.click()
    await expect(password).toHaveAttribute('type', 'text')
    const hide = page.getByRole('button', { name: 'Hide password' })
    await expect(hide).toHaveAttribute('aria-pressed', 'true')
    await hide.click()
    await expect(password).toHaveAttribute('type', 'password')
    await expect(page.getByRole('alert')).toHaveCount(0)
    expect(api.count('me')).toBe(0)
  })

  test('TC-100 admin login success lands on /admin table', async ({ page, api }) => {
    await gotoAs(page, 'none', '/login/admin')
    await page.getByLabel('Email').fill('adminox@gmail.com')
    await page.getByLabel('Password', { exact: true }).fill('correct horse')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByRole('heading', { name: /Admin\s*·\s*Players/ })).toBeVisible()
    expect(api.count('me')).toBeGreaterThan(0)
  })

  test('TC-101 admin stays signed in after refresh', async ({ page }) => {
    await gotoAs(page, 'none', '/login/admin')
    await page.getByLabel('Email').fill('adminox@gmail.com')
    await page.getByLabel('Password', { exact: true }).fill('correct horse')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page).toHaveURL(/\/admin$/)
    await page.reload()
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByRole('heading', { name: /Admin\s*·\s*Players/ })).toBeVisible()
  })

  test('TC-102 admin sign out returns to /login/admin', async ({ page }) => {
    await gotoAs(page, 'admin', '/admin')
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login\/admin$/)
    await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible()
  })

  test('TC-103 wrong password and unknown email give the same generic alert', async ({ page }) => {
    await patchAuth(page, { rejectPassword: 'wrong-password' })
    await gotoAs(page, 'none', '/login/admin')
    const email = page.getByLabel('Email')
    const password = page.getByLabel('Password', { exact: true })
    const submit = page.getByRole('button', { name: 'Sign in', exact: true })

    await email.fill('adminox@gmail.com')
    await password.fill('wrong-password')
    await submit.click()
    const alert = page.getByRole('alert')
    await expect(alert).toContainText(INVALID)
    const firstText = await alert.innerText()
    await expect(email).toHaveValue('adminox@gmail.com')
    await expect(password).toHaveValue('')
    await expect(password).toBeFocused()
    await expect(email).not.toHaveAttribute('aria-invalid', 'true')
    await expect(password).not.toHaveAttribute('aria-invalid', 'true')

    await email.fill('nobody@example.com')
    await password.fill('whatever')
    await submit.click()
    await expect(alert).toContainText(INVALID)
    expect(await alert.innerText()).toBe(firstText)
    await expect(email).toHaveValue('nobody@example.com')
    await expect(password).toHaveValue('')
    await expect(password).toBeFocused()
    await expect(page).toHaveURL(/\/login\/admin(\?.*)?$/)
  })

  test('TC-104 loading state disables the button and sends one sign-in', async ({ page, api }) => {
    await gotoAs(page, 'none', '/login/admin')
    await page.getByLabel('Email').fill('adminox@gmail.com')
    await page.getByLabel('Password', { exact: true }).fill('correct horse')
    const release = api.hold('me')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    const busy = page.getByRole('button', { name: 'Signing in…' })
    await expect(busy).toBeDisabled()
    await expect(busy).toHaveAttribute('aria-busy', 'true')
    // fake sign-in triggers /api/me twice (sign-in check + auth provider); both are held
    await expect.poll(() => api.count('me')).toBe(2)
    await busy.click({ force: true })
    release()
    await expect(page).toHaveURL(/\/admin$/)
    expect(api.count('me')).toBe(2)
  })

  test('TC-105 valid non-admin account is rejected with the same message', async ({ page, api }) => {
    api.meIsAdmin = false
    api.profile = makeProfile({ displayName: 'Not Admin' })
    await gotoAs(page, 'none', '/login/admin')
    await page.getByLabel('Email').fill('adminox@gmail.com')
    await page.getByLabel('Password', { exact: true }).fill('correct horse')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    const alert = page.getByRole('alert')
    await expect(alert).toContainText(INVALID)
    await expect(alert).not.toContainText(/admin|permission|not authorized/i)
    await expect(page).toHaveURL(/\/login\/admin(\?.*)?$/)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login\/admin$/)
    await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible()
  })

  test('TC-112 signed-in admin is redirected from / and /login/admin to /admin', async ({ page }) => {
    await gotoAs(page, 'admin', '/')
    await expect(page).toHaveURL(/\/admin$/)
    await page.goto('/login/admin')
    await expect(page).toHaveURL(/\/admin$/)
  })

  test('TC-113 player cannot bypass through admin routes', async ({ page, api }) => {
    await gotoAs(page, 'player', '/admin')
    await expect(page.getByRole('heading', { name: 'Not authorized' })).toBeVisible()
    expect(api.count('admin')).toBe(0)
    await page.getByRole('link', { name: 'Back to Play' }).click()
    await expect(page.getByRole('heading', { name: 'New game' })).toBeVisible()
  })

  test.describe('360px', () => {
    test.use({ viewport: { width: 360, height: 800 } })

    test('TC-114 admin login mobile 360px fits without horizontal scroll', async ({ page }) => {
      await gotoAs(page, 'none', '/login/admin')
      await expect(page.getByLabel('Email')).toBeInViewport({ ratio: 1 })
      await expect(page.getByLabel('Password', { exact: true })).toBeInViewport({ ratio: 1 })
      await expect(page.getByRole('button', { name: 'Show password' })).toBeInViewport({ ratio: 1 })
      await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeInViewport({ ratio: 1 })
      await expectNoHorizontalScroll(page)
    })
  })
})
