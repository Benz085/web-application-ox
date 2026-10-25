import { test, expect, entry } from './helpers/fixtures.ts'
import { expectNoHorizontalScroll, gotoAs } from './helpers/ui.ts'

const PLAYERS = [
  entry(1, 'Sam Lee', 12, { wins: 13, losses: 2, draws: 1 }),
  entry(2, 'Alex Morgan', 9, { isYou: true, wins: 10, losses: 3, draws: 2 }),
  entry(3, 'Jo Rivers', 7, { wins: 8, losses: 4, draws: 0 }),
  entry(4, 'Kim Park', 3, { wins: 5, losses: 6, draws: 1 }),
  entry(5, 'Pat Singh', -2, { wins: 1, losses: 3, draws: 0 }),
]

test.describe('S4 leaderboard', () => {
  test('TC-64 default: rows sorted with rank, name, score and W/L/D', async ({ page, api }) => {
    api.leaderboard = PLAYERS
    await gotoAs(page, 'player', '/leaderboard')
    await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible()
    await expect(page.getByRole('row')).toHaveCount(6)
    const headers = page.getByRole('columnheader')
    await expect(headers.first()).toHaveText('Rank')
    await expect(headers.nth(1)).toHaveText('Player')
    await expect(headers.nth(2)).toHaveText('Score')
    for (const [i, p] of PLAYERS.entries()) {
      const row = page.getByRole('row').nth(i + 1)
      await expect(row.getByRole('cell').first()).toHaveText(String(p.rank))
      await expect(row.getByRole('rowheader')).toContainText(p.displayName)
      const cells = row.getByRole('cell')
      await expect(cells.nth(1)).toHaveText(p.score < 0 ? `−${Math.abs(p.score)}` : String(p.score))
      await expect(cells.nth(2)).toHaveText(String(p.wins))
      await expect(cells.nth(3)).toHaveText(String(p.losses))
      await expect(cells.nth(4)).toHaveText(String(p.draws))
    }
    await expect(page.getByText('5 players')).toBeVisible()
  })

  test('TC-65 leaderboard never shows an email', async ({ page, api }) => {
    api.leaderboard = PLAYERS
    await gotoAs(page, 'player', '/leaderboard')
    await expect(page.getByRole('row')).toHaveCount(6)
    await expect(page.getByRole('main')).not.toContainText('@')
    await expect(page.getByRole('columnheader', { name: /email/i })).toHaveCount(0)
    await expect(page.getByText(/visible to admins only/i)).toHaveCount(0)
  })

  test('TC-67 tied players are ranked sequentially in server order', async ({ page, api }) => {
    api.leaderboard = [
      entry(1, 'Ann Tie', 5, { wins: 5 }),
      entry(2, 'Bob Tie', 5, { wins: 5 }),
      entry(3, 'Cy Tie', 5, { wins: 4, draws: 2 }),
      entry(4, 'Di Low', 1, { wins: 1 }),
    ]
    await gotoAs(page, 'player', '/leaderboard')
    await expect(page.getByRole('row')).toHaveCount(5)
    const names = ['Ann Tie', 'Bob Tie', 'Cy Tie', 'Di Low']
    for (const [i, name] of names.entries()) {
      const row = page.getByRole('row').nth(i + 1)
      await expect(row.getByRole('cell').first()).toHaveText(String(i + 1))
      await expect(row.getByRole('rowheader')).toContainText(name)
    }
  })

  test('TC-69 current user row is marked with a You tag', async ({ page, api }) => {
    api.leaderboard = PLAYERS
    await gotoAs(page, 'player', '/leaderboard')
    const mine = page.getByRole('row', { name: /Alex Morgan/ })
    await expect(mine.getByText('You', { exact: true })).toBeVisible()
    await expect(mine).toHaveAttribute('aria-current', 'true')
    await expect(page.getByText('You', { exact: true })).toHaveCount(1)
    await expect(page.getByRole('row', { name: /Sam Lee/ })).not.toHaveAttribute('aria-current', 'true')
  })

  test('TC-70 empty state', async ({ page, api }) => {
    api.leaderboard = []
    await gotoAs(page, 'player', '/leaderboard')
    await expect(page.getByRole('heading', { name: 'No players yet' })).toBeVisible()
    await expect(page.getByText('Scores show up here after a game is finished.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Play a game' })).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
  })

  test('TC-72 loading then error state', async ({ page, api }) => {
    const release = api.hold('leaderboard')
    api.fail('leaderboard', { status: 500 })
    await gotoAs(page, 'player', '/leaderboard')
    await expect(page.getByRole('status').getByText('Loading…')).toBeVisible()
    release()
    await expect(page.getByRole('alert')).toContainText("Couldn't reach the server. Try again.")
    await expect(page.getByRole('table')).toHaveCount(0)
    api.fail('leaderboard', null)
    api.leaderboard = PLAYERS
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByRole('row')).toHaveCount(6)
  })

  test('TC-82 admin can open the leaderboard without emails or an admin row', async ({ page, api }) => {
    api.leaderboard = PLAYERS.map((p) => ({ ...p, isYou: false }))
    await gotoAs(page, 'admin', '/admin')
    await page.getByRole('link', { name: 'Leaderboard' }).click()
    await expect(page).toHaveURL(/\/leaderboard$/)
    await expect(page.getByRole('row')).toHaveCount(6)
    await expect(page.getByRole('main')).not.toContainText('@')
    await expect(page.getByRole('main')).not.toContainText('Admin OX')
    await expect(page.getByText('You', { exact: true })).toHaveCount(0)
  })

  test.describe('mobile 375x812', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('TC-71 leaderboard mobile has no horizontal scroll', async ({ page, api }) => {
      api.leaderboard = PLAYERS
      await gotoAs(page, 'player', '/leaderboard')
      await expect(page.getByRole('row')).toHaveCount(6)
      await expect(page.getByRole('row', { name: /Pat Singh/ })).toBeVisible()
      await expectNoHorizontalScroll(page)
    })
  })
})
