import { GoogleControl, patchAuth } from './helpers/auth.ts'
import { test, expect } from './helpers/fixtures.ts'
import { gotoAs } from './helpers/ui.ts'

test.describe('S1 login and route guards', () => {
  test('TC-1 logged out / redirects to /login', async ({ page, api }) => {
    await gotoAs(page, 'none', '/')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'New game' })).toHaveCount(0)
    expect(api.count('current')).toBe(0)
  })

  test('TC-2 logged out /leaderboard redirects to /login', async ({ page }) => {
    await gotoAs(page, 'none', '/leaderboard')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Leaderboard' })).toHaveCount(0)
  })

  test('TC-3 logged out /admin redirects to /login/admin', async ({ page }) => {
    await gotoAs(page, 'none', '/admin')
    await expect(page).toHaveURL(/\/login\/admin$/)
    await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible()
  })

  test('TC-4 login default state has Google only and no admin entry point', async ({ page }) => {
    await gotoAs(page, 'none', '/login')
    await expect(page.getByRole('heading', { name: 'OX Game' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeEnabled()
    await expect(page.getByLabel(/email/i)).toHaveCount(0)
    await expect(page.getByLabel(/password/i)).toHaveCount(0)
    await expect(page.getByRole('link')).toHaveCount(0)
    await expect(page.getByText(/admin/i)).toHaveCount(0)
    expect(await page.content()).not.toMatch(/login\/admin/i)
  })

  test('TC-5 login loading state blocks a second sign-in', async ({ page }) => {
    const google = new GoogleControl()
    await patchAuth(page, { google })
    await gotoAs(page, 'none', '/login')
    const release = google.hold()
    await page.getByRole('button', { name: 'Sign in with Google' }).click()
    const busy = page.getByRole('button', { name: 'Signing in…' })
    await expect(busy).toBeDisabled()
    await expect(busy).toHaveAttribute('aria-busy', 'true')
    await expect(page.getByText('Finish signing in with Google in the popup window.')).toBeVisible()
    await busy.click({ force: true })
    release()
    await expect(page.getByRole('heading', { name: 'New game' })).toBeVisible()
    expect(google.calls).toBe(1)
  })

  test('TC-6 login error state shows alert and allows retry', async ({ page }) => {
    const google = new GoogleControl()
    await patchAuth(page, { google })
    await gotoAs(page, 'none', '/login')
    google.failWith('auth/internal-error')
    await page.getByRole('button', { name: 'Sign in with Google' }).click()
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Sign-in failed')
    await expect(alert).toContainText('Something went wrong. Please try again.')
    const retry = page.getByRole('button', { name: 'Sign in with Google' })
    await expect(retry).toBeEnabled()

    const release = google.hold()
    await retry.click()
    await expect(page.getByRole('button', { name: 'Signing in…' })).toBeDisabled()
    await expect(page.getByRole('alert')).toHaveCount(0)
    google.failWith(null)
    release()
    await expect(page.getByRole('heading', { name: 'New game' })).toBeVisible()
  })

  test('TC-10 session survives refresh', async ({ page }) => {
    await gotoAs(page, 'player', '/')
    await expect(page.getByRole('heading', { name: 'New game' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'New game' })).toBeVisible()
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  })

  test('TC-11 sign out returns to login and / is guarded again', async ({ page }) => {
    await gotoAs(page, 'player', '/')
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('TC-16 signed-out header variant shows no app navigation', async ({ page }) => {
    await gotoAs(page, 'none', '/login')
    await expect(page.getByRole('banner')).toHaveCount(0)
    await expect(page.getByRole('navigation')).toHaveCount(0)
    for (const name of ['Play', 'Leaderboard', 'Admin']) {
      await expect(page.getByRole('link', { name })).toHaveCount(0)
    }
    await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0)
  })

  test('TC-116 /login has no admin form or link', async ({ page }) => {
    await gotoAs(page, 'none', '/login')
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible()
    await expect(page.getByLabel(/password/i)).toHaveCount(0)
    await expect(page.getByRole('textbox')).toHaveCount(0)
    await expect(page.getByRole('link')).toHaveCount(0)
    expect(await page.content()).not.toMatch(/href=["'][^"']*admin/i)
  })
})
