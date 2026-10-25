import { test, expect, adminPlayer } from './helpers/fixtures.ts'
import { expectNoHorizontalScroll, gotoAs } from './helpers/ui.ts'

const PLAYERS = [
  adminPlayer('u-a', 'a@x.test', { score: 5, streak: 2, wins: 6, losses: 3, draws: 1, lastPlayedAt: '2026-01-10T10:00:00Z' }),
  adminPlayer('u-b', 'b@x.test', { score: 9, streak: 0, wins: 10, losses: 1, draws: 0, lastPlayedAt: '2026-01-12T10:00:00Z' }),
  adminPlayer('u-c', 'c@x.test', { score: -2, streak: 1, wins: 2, losses: 5, draws: 2, lastPlayedAt: '2026-01-11T10:00:00Z' }),
  adminPlayer('u-d', 'd@x.test'), // never finished a game
]

const emails = (list: string[]) => list.map((l) => `${l}@x.test`)

test.describe('S4 admin page', () => {
  test('TC-75 admin table lists all players, sorted by score by default', async ({ page, api }) => {
    api.adminPlayers = PLAYERS
    await gotoAs(page, 'admin', '/admin')
    await expect(page.getByRole('heading', { name: /Admin\s*·\s*Players/ })).toBeVisible()
    await expect(page.getByText('Visible to admins only')).toBeVisible()
    await expect(page.getByText('4 players')).toBeVisible()
    for (const name of ['Email', 'Score', 'Streak', 'Wins', 'Losses', 'Draws', 'Last played']) {
      await expect(page.getByRole('columnheader', { name: new RegExp(`^${name}`) })).toBeVisible()
    }
    await expect(page.getByRole('columnheader', { name: /^Score/ })).toHaveAttribute('aria-sort', 'descending')
    await expect(page.getByRole('rowheader')).toHaveText(emails(['b', 'a', 'd', 'c']))
    const zeroGame = page.getByRole('row', { name: /d@x\.test/ })
    await expect(zeroGame.getByRole('cell').last()).toHaveText('—')
    await expect(page.getByRole('row', { name: /c@x\.test/ }).getByRole('cell').first()).toHaveText('−2')
    await expect(page.getByRole('row', { name: /a@x\.test/ }).getByRole('cell').nth(1)).toHaveText('2/3')
  })

  test('TC-76 sortable headers reorder rows and expose aria-sort', async ({ page, api }) => {
    api.adminPlayers = PLAYERS
    await gotoAs(page, 'admin', '/admin')
    await expect(page.getByRole('rowheader')).toHaveCount(4)

    // A column that is not active starts descending (Email: ascending); the 2nd click flips it.
    // [header, order after 1st click, order after 2nd click, aria-sort after 1st, after 2nd]
    const cases: [string, string[], string[], string, string][] = [
      ['Email', ['a', 'b', 'c', 'd'], ['d', 'c', 'b', 'a'], 'ascending', 'descending'],
      ['Score', ['b', 'a', 'd', 'c'], ['c', 'd', 'a', 'b'], 'descending', 'ascending'],
      ['Streak', ['a', 'c', 'b', 'd'], ['b', 'd', 'c', 'a'], 'descending', 'ascending'],
      ['Wins', ['b', 'a', 'c', 'd'], ['d', 'c', 'a', 'b'], 'descending', 'ascending'],
      ['Losses', ['c', 'a', 'b', 'd'], ['d', 'b', 'a', 'c'], 'descending', 'ascending'],
      ['Draws', ['c', 'a', 'b', 'd'], ['b', 'd', 'a', 'c'], 'descending', 'ascending'],
      ['Last played', ['b', 'c', 'a', 'd'], ['a', 'c', 'b', 'd'], 'descending', 'ascending'],
    ]
    for (const [name, first, second, sortFirst, sortSecond] of cases) {
      const header = page.getByRole('columnheader', { name: new RegExp(`^${name}`) })
      const button = header.getByRole('button')
      await button.click()
      await expect(page.getByRole('rowheader')).toHaveText(emails(first))
      await expect(header).toHaveAttribute('aria-sort', sortFirst)
      for (const other of cases.filter(([n]) => n !== name)) {
        await expect(page.getByRole('columnheader', { name: new RegExp(`^${other[0]}`) })).toHaveAttribute('aria-sort', 'none')
      }
      await button.click()
      await expect(page.getByRole('rowheader')).toHaveText(emails(second))
      await expect(header).toHaveAttribute('aria-sort', sortSecond)
    }

    // keyboard: headers are buttons operable with Enter
    const wins = page.getByRole('columnheader', { name: /^Wins/ }).getByRole('button')
    await wins.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('rowheader')).toHaveText(emails(['b', 'a', 'c', 'd']))
  })

  test.describe('time zones', () => {
    test.describe('Asia/Bangkok', () => {
      test.use({ timezoneId: 'Asia/Bangkok' })
      test('TC-77 last played is shown in the viewer time zone (Bangkok, UTC+7)', async ({ page, api }) => {
        api.adminPlayers = [adminPlayer('u-a', 'a@x.test', { score: 1, wins: 1, lastPlayedAt: '2026-01-15T17:30:00Z' })]
        await gotoAs(page, 'admin', '/admin')
        await expect(page.getByRole('row', { name: /a@x\.test/ })).toContainText('2026-01-16 00:30')
      })
    })
    test.describe('America/New_York', () => {
      test.use({ timezoneId: 'America/New_York' })
      test('TC-77 last played is shown in the viewer time zone (New York, UTC-5)', async ({ page, api }) => {
        api.adminPlayers = [adminPlayer('u-a', 'a@x.test', { score: 1, wins: 1, lastPlayedAt: '2026-01-15T17:30:00Z' })]
        await gotoAs(page, 'admin', '/admin')
        await expect(page.getByRole('row', { name: /a@x\.test/ })).toContainText('2026-01-15 12:30')
      })
    })
  })

  test.describe('mobile 375x812', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('TC-78 admin mobile shows cards with a sort select', async ({ page, api }) => {
      api.adminPlayers = PLAYERS
      await gotoAs(page, 'admin', '/admin')
      const cards = page.getByRole('list', { name: 'Players' }).getByRole('listitem')
      await expect(cards).toHaveCount(4)
      await expect(page.getByRole('table')).toHaveCount(0)
      await expect(cards.first()).toContainText('b@x.test')
      await expect(cards.first()).toContainText('Score')
      await expect(cards.last()).toContainText('c@x.test')
      await page.getByLabel('Sort by').selectOption('email:asc')
      await expect(cards.first()).toContainText('a@x.test')
      await expect(cards.last()).toContainText('d@x.test')
      await expectNoHorizontalScroll(page)
    })
  })

  test('TC-79 non-admin sees the not-authorized state and no player data', async ({ page, api }) => {
    api.adminPlayers = PLAYERS
    api.fail('admin', { status: 403, code: 'FORBIDDEN' })
    await gotoAs(page, 'player', '/admin')
    await expect(page.getByRole('heading', { name: 'Not authorized' })).toBeVisible()
    await expect(page.getByText("You don't have permission to view this page.")).toBeVisible()
    await expect(page.getByRole('main')).not.toContainText('@x.test')
    await expect(page.getByRole('table')).toHaveCount(0)
  })

  test('TC-80 non-admin has no Admin nav link on any page', async ({ page }) => {
    await gotoAs(page, 'player', '/')
    const nav = page.getByRole('navigation', { name: 'Main' })
    await expect(nav.getByRole('link', { name: 'Leaderboard' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Admin' })).toHaveCount(0)
    await nav.getByRole('link', { name: 'Leaderboard' }).click()
    await expect(page).toHaveURL(/\/leaderboard$/)
    await expect(nav.getByRole('link', { name: 'Admin' })).toHaveCount(0)
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Not authorized' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Admin' })).toHaveCount(0)
  })

  test('TC-87 admin list loading then error state', async ({ page, api }) => {
    const release = api.hold('admin')
    api.fail('admin', { status: 500 })
    await gotoAs(page, 'admin', '/admin')
    await expect(page.getByRole('status').getByText('Loading…')).toBeVisible()
    release()
    await expect(page.getByRole('alert')).toContainText("Couldn't reach the server. Try again.")
    await expect(page.getByRole('table')).toHaveCount(0)
    api.fail('admin', null)
    api.adminPlayers = PLAYERS
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByRole('rowheader')).toHaveCount(4)
  })
})
