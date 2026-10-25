import { test, expect } from './helpers/fixtures.ts'
import { board, cell, expectNoHorizontalScroll, expectStats, gotoAs, playDraw, playLoss, playWin, startGame } from './helpers/ui.ts'
import { makeProfile } from './helpers/mockApi.ts'

test.describe('S3 scoring and game over', () => {
  test('TC-47 win +1 on a diagonal', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await startGame(page)
    await playWin(page, api)
    await expect(page.getByRole('heading', { name: 'You win!', exact: true })).toBeVisible()
    await expect(page.getByLabel('Score change +1')).toHaveText('+1')
    await expect(page.getByText('You got three X in a diagonal.')).toBeVisible()
    await expect(page.getByText('+1 point for the win.')).toBeVisible()
    for (const i of [0, 4, 8]) await expect(cell(page, i)).toHaveClass(/board__cell--win/)
    await expectStats(page, { score: '1', streak: 1, wins: 1, losses: 0, draws: 0 })
  })

  test('TC-48 third win in a row gives +2 and resets the streak', async ({ page, api }) => {
    api.profile = makeProfile({ score: 5, streak: 2, wins: 2 })
    await gotoAs(page, 'player', '/')
    await startGame(page)
    await playWin(page, api)
    await expect(page.getByRole('heading', { name: '3 wins in a row!' })).toBeVisible()
    await expect(page.getByLabel('Score change +2')).toHaveText('+2')
    await expect(page.getByText('+1 for the win, +1 streak bonus.')).toBeVisible()
    await expect(page.getByText('Win streak starts again at 0/3.')).toBeVisible()
    await expectStats(page, { score: '7', streak: 0, wins: 3, losses: 0, draws: 0 })
  })

  test('TC-49 streak restarts after the bonus', async ({ page, api }) => {
    api.profile = makeProfile({ score: 5, streak: 2, wins: 2 })
    await gotoAs(page, 'player', '/')
    await startGame(page)
    await playWin(page, api)
    await expect(page.getByLabel('Score change +2')).toBeVisible()
    await page.getByRole('button', { name: 'Play again' }).click()
    await expect(page.getByText('Your turn', { exact: true })).toBeVisible()
    await playWin(page, api)
    await expect(page.getByRole('heading', { name: 'You win!', exact: true })).toBeVisible()
    await expect(page.getByLabel('Score change +1')).toBeVisible()
    await expect(page.getByText('Win streak is now 1/3.')).toBeVisible()
    await expectStats(page, { score: '8', streak: 1, wins: 4, losses: 0, draws: 0 })
  })

  test('TC-50 loss -1 shows "You lose" with the bot line', async ({ page, api }) => {
    api.profile = makeProfile({ score: 1, streak: 1, wins: 1 })
    await gotoAs(page, 'player', '/')
    await startGame(page)
    await playLoss(page, api)
    await expect(page.getByRole('heading', { name: 'You lose', exact: true })).toBeVisible()
    await expect(page.getByLabel('Score change −1')).toHaveText('−1')
    await expect(page.getByText('The bot got three O in the middle column.')).toBeVisible()
    await expect(page.getByText('Win streak resets to 0/3.')).toBeVisible()
    for (const i of [1, 4, 7]) await expect(cell(page, i)).toHaveClass(/board__cell--loss/)
    await expectStats(page, { score: '0', streak: 0, wins: 1, losses: 1, draws: 0 })
  })

  test('TC-51 score goes negative and is shown with a minus sign (stats panel)', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await startGame(page)
    await playLoss(page, api)
    await expectStats(page, { score: '−1', streak: 0, wins: 0, losses: 1, draws: 0 })
    await page.getByRole('button', { name: 'Change difficulty' }).click()
    await expect(page.getByRole('heading', { name: 'New game' })).toBeVisible()
    await expectStats(page, { score: '−1', streak: 0, wins: 0, losses: 1, draws: 0 })
  })

  test('TC-51 score goes negative and is shown with a minus sign (leaderboard row)', async ({ page, api }) => {
    api.leaderboard = [
      { rank: 1, isYou: false, displayName: 'Sam Lee', photoURL: null, score: 4, wins: 4, losses: 0, draws: 0 },
      { rank: 2, isYou: true, displayName: 'Alex Morgan', photoURL: null, score: -1, wins: 0, losses: 1, draws: 0 },
    ]
    await gotoAs(page, 'player', '/leaderboard')
    await expect(page.getByRole('row', { name: /Alex Morgan/ }).getByRole('cell').nth(1)).toHaveText('−1')
  })

  test('TC-52 draw gives 0 points and resets the streak', async ({ page, api }) => {
    api.profile = makeProfile({ score: 4, streak: 2, wins: 2, losses: 0 })
    await gotoAs(page, 'player', '/')
    await startGame(page)
    await playDraw(page, api)
    await expect(page.getByRole('heading', { name: "It's a draw" })).toBeVisible()
    await expect(page.getByLabel('Score change 0')).toHaveText('0')
    await expect(page.getByText('No points this game.')).toBeVisible()
    for (let i = 0; i < 9; i++) await expect(cell(page, i)).not.toHaveClass(/board__cell--(win|loss)/)
    await expectStats(page, { score: '4', streak: 0, wins: 2, losses: 0, draws: 1 })
  })

  test('TC-54 result is not conveyed by colour only', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await startGame(page)
    await playWin(page, api)
    const status = page.locator('[aria-live="polite"]')
    await expect(status).toContainText('Game over')
    await expect(page.getByRole('heading', { name: 'You win!' })).toBeFocused()
    await expect(page.getByText('You got three X in a diagonal.')).toBeVisible()
    await expect(page.getByLabel('Score change +1')).toBeVisible()

    await page.getByRole('button', { name: 'Play again' }).click()
    await expect(page.getByText('Your turn', { exact: true })).toBeVisible()
    await playLoss(page, api)
    await expect(status).toContainText('Game over')
    await expect(page.getByRole('heading', { name: 'You lose', exact: true })).toBeFocused()
    await expect(page.getByText('The bot got three O in the middle column.')).toBeVisible()
    await expect(page.getByLabel('Score change −1')).toBeVisible()
  })

  test('TC-55 Play again keeps the difficulty and skips Setup', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await startGame(page, 'hard')
    await playWin(page, api)
    await page.getByRole('button', { name: 'Play again' }).click()
    await expect(page.getByText('Your turn', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'New game' })).toHaveCount(0)
    expect(api.bodies('start')).toEqual([{ difficulty: 'hard' }, { difficulty: 'hard' }])
    for (let i = 0; i < 9; i++) await expect(cell(page, i)).toHaveAccessibleName(/, empty$/)
  })

  test('TC-56 Change difficulty goes to Setup with updated stats', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await startGame(page, 'hard')
    await playWin(page, api)
    await page.getByRole('button', { name: 'Change difficulty' }).click()
    await expect(page.getByRole('heading', { name: 'New game' })).toBeVisible()
    await expect(board(page)).toHaveCount(0)
    await expect(page.getByRole('radio', { name: /^Hard/ })).toHaveAttribute('aria-checked', 'true')
    await expectStats(page, { score: '1', streak: 1, wins: 1, losses: 0, draws: 0 })
  })

  test('TC-58 stats update after each finished game (win, loss, draw)', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await startGame(page)
    await playWin(page, api)
    await expectStats(page, { score: '1', streak: 1, wins: 1, losses: 0, draws: 0 })
    await page.getByRole('button', { name: 'Play again' }).click()
    await expect(page.getByText('Your turn', { exact: true })).toBeVisible()
    await playLoss(page, api)
    await expectStats(page, { score: '0', streak: 0, wins: 1, losses: 1, draws: 0 })
    await page.getByRole('button', { name: 'Play again' }).click()
    await expect(page.getByText('Your turn', { exact: true })).toBeVisible()
    await playDraw(page, api)
    await expectStats(page, { score: '0', streak: 0, wins: 1, losses: 1, draws: 1 })
    await page.getByRole('button', { name: 'Change difficulty' }).click()
    await expectStats(page, { score: '0', streak: 0, wins: 1, losses: 1, draws: 1 })
    await page.reload()
    await expectStats(page, { score: '0', streak: 0, wins: 1, losses: 1, draws: 1 })
  })

  test('TC-63 streak text and hint for 0, 1 and 2 wins in a row', async ({ page, api }) => {
    const hints = ['Win 3 in a row for a +1 bonus', '2 more wins in a row for a +1 bonus', '1 more win in a row for a +1 bonus']
    for (const streak of [0, 1, 2]) {
      api.profile = makeProfile({ streak, wins: streak, score: streak })
      await gotoAs(page, 'player', '/')
      await expectStats(page, { score: String(streak), streak, wins: streak, losses: 0, draws: 0 })
      await expect(page.getByText(hints[streak])).toBeVisible()
    }
  })

  test.describe('mobile 375x812', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('TC-57 game over mobile layout has no horizontal scroll', async ({ page, api }) => {
      await gotoAs(page, 'player', '/')
      await startGame(page)
      await playWin(page, api)
      await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Change difficulty' })).toBeVisible()
      await expectNoHorizontalScroll(page)
    })
  })
})
