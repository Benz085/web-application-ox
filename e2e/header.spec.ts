import { patchAuth } from './helpers/auth.ts'
import { test, expect } from './helpers/fixtures.ts'
import { expectNoHorizontalScroll, gotoAs } from './helpers/ui.ts'

test.describe('S4 header', () => {
  test('TC-73 player header: Play, Leaderboard, Sign out, name and initials', async ({ page }) => {
    await gotoAs(page, 'player', '/')
    const header = page.getByRole('banner')
    const nav = header.getByRole('navigation', { name: 'Main' })
    await expect(nav.getByRole('link')).toHaveText(['Play', 'Leaderboard'])
    await expect(nav.getByRole('link', { name: 'Play' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Leaderboard' })).not.toHaveAttribute('aria-current', 'page')
    await expect(header.getByRole('button', { name: 'Sign out' })).toBeVisible()
    await expect(header.getByText('Alex Morgan', { exact: true })).toBeVisible()
    await expect(header.getByText('AM', { exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Admin' })).toHaveCount(0)

    await nav.getByRole('link', { name: 'Leaderboard' }).click()
    await expect(nav.getByRole('link', { name: 'Leaderboard' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Play' })).not.toHaveAttribute('aria-current', 'page')
  })

  test('TC-73 player header falls back to the email prefix without a display name', async ({ page }) => {
    await patchAuth(page, { playerWithoutDisplayName: true })
    await gotoAs(page, 'player', '/')
    const header = page.getByRole('banner')
    await expect(header.getByText('alex.morgan', { exact: true })).toBeVisible()
    await expect(header.getByText('AL', { exact: true })).toBeVisible()
  })

  test('TC-81 admin header: Leaderboard, Admin, Sign out, name Admin OX', async ({ page }) => {
    await gotoAs(page, 'admin', '/admin')
    const header = page.getByRole('banner')
    const nav = header.getByRole('navigation', { name: 'Main' })
    await expect(nav.getByRole('link')).toHaveText(['Leaderboard', 'Admin'])
    await expect(nav.getByRole('link', { name: 'Admin' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Play' })).toHaveCount(0)
    await expect(header.getByText('Admin OX', { exact: true })).toBeVisible()
    await expect(header.getByText('AO', { exact: true })).toBeVisible()
    await expect(header.getByRole('button', { name: 'Sign out' })).toBeVisible()
  })

  test.describe('mobile 375x812', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('TC-74 header on mobile keeps every link reachable', async ({ page }) => {
      await gotoAs(page, 'player', '/')
      const header = page.getByRole('banner')
      const play = header.getByRole('link', { name: 'Play' })
      const board = header.getByRole('link', { name: 'Leaderboard' })
      await expect(play).toBeInViewport({ ratio: 1 })
      await expect(board).toBeInViewport({ ratio: 1 })
      await expect(header.getByRole('button', { name: 'Sign out' })).toBeInViewport({ ratio: 1 })
      await expectNoHorizontalScroll(page)
      await board.click()
      await expect(page).toHaveURL(/\/leaderboard$/)
      await play.click()
      await expect(page.getByRole('heading', { name: 'New game' })).toBeVisible()
    })
  })
})
