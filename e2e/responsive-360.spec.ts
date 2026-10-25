import { test, expect, adminPlayer, entry } from './helpers/fixtures.ts'
import { expectNoHorizontalScroll, gotoAs, playWin, startGame } from './helpers/ui.ts'

test.use({ viewport: { width: 360, height: 800 } })

test('TC-90 no horizontal scroll at 360px on every page', async ({ page, api }) => {
  api.leaderboard = [
    entry(1, 'A Very Long Player Name Number One', 12, { wins: 12 }),
    entry(2, 'Alex Morgan', 9, { isYou: true, wins: 9 }),
  ]
  api.adminPlayers = [
    adminPlayer('u-a', 'a.very.long.email.address.for.testing@example-domain.test', { score: 5, wins: 5, lastPlayedAt: '2026-01-10T10:00:00Z' }),
    adminPlayer('u-b', 'b@x.test', { score: -2, losses: 2 }),
  ]

  await gotoAs(page, 'none', '/login')
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible()
  await expectNoHorizontalScroll(page)

  await page.goto('/login/admin')
  await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible()
  await expectNoHorizontalScroll(page)

  await gotoAs(page, 'player', '/')
  await expect(page.getByRole('heading', { name: 'New game' })).toBeVisible()
  await expectNoHorizontalScroll(page)

  await startGame(page)
  await expectNoHorizontalScroll(page)

  await playWin(page, api)
  await expectNoHorizontalScroll(page)

  await page.goto('/leaderboard')
  await expect(page.getByRole('row', { name: /Alex Morgan/ })).toBeVisible()
  await expectNoHorizontalScroll(page)

  await gotoAs(page, 'admin', '/admin')
  await expect(page.getByRole('list', { name: 'Players' }).getByRole('listitem')).toHaveCount(2)
  await expectNoHorizontalScroll(page)
})
