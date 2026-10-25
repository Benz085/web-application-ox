import { test, expect } from './helpers/fixtures.ts'
import { board, cell, expectStats, gotoAs } from './helpers/ui.ts'
import { emptyBoard, makeProfile } from './helpers/mockApi.ts'

function unfinishedBoard() {
  const b = emptyBoard()
  b[0] = 'X'
  b[4] = 'O'
  return b
}

test.describe('S2 resume unfinished game', () => {
  test.beforeEach(async ({ api }) => {
    api.profile = makeProfile({ score: 3, streak: 2, wins: 3, losses: 1 })
    api.seedGame({ board: unfinishedBoard(), difficulty: 'hard' })
  })

  test('TC-31 resume banner after reload', async ({ page }) => {
    await gotoAs(page, 'player', '/')
    await expect(page.getByRole('heading', { name: 'You have an unfinished game' })).toBeVisible()
    await expect(page.getByText(/Difficulty: Hard · 2 moves played/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Resume game' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Start new game' })).toBeEnabled()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'You have an unfinished game' })).toBeVisible()
  })

  test('TC-32 resume restores the board and difficulty', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await page.getByRole('button', { name: 'Resume game' }).click()
    await expect(board(page)).toBeVisible()
    await expect(cell(page, 0)).toHaveAccessibleName('Row 1, column 1, X')
    await expect(cell(page, 4)).toHaveAccessibleName('Row 2, column 2, O')
    await expect(cell(page, 8)).toHaveAccessibleName('Row 3, column 3, empty')
    await expect(page.getByText(/Difficulty: Hard/)).toBeVisible()
    await expect(page.getByText('Your turn', { exact: true })).toBeVisible()
    expect(api.count('start')).toBe(0)
  })

  test('TC-33 start new game asks for confirmation and Cancel keeps the game', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await page.getByRole('button', { name: 'Start new game' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText('Start a new game?')
    await expect(dialog).toContainText('Your unfinished game will count as a loss (−1 point, streak back to 0).')
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'You have an unfinished game' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start new game' })).toBeVisible()
    expect(api.count('abandon')).toBe(0)
    expect(api.count('start')).toBe(0)
  })

  test('TC-34 confirm abandons the game as a loss and starts a new one', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await expectStats(page, { score: '3', streak: 2, wins: 3, losses: 1, draws: 0 })
    await page.getByRole('button', { name: 'Start new game' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Yes, start new game' }).click()

    await expect(board(page)).toBeVisible()
    for (let i = 0; i < 9; i++) await expect(cell(page, i)).toHaveAccessibleName(/, empty$/)
    expect(api.requests.filter((r) => r.endpoint === 'abandon' || r.endpoint === 'start').map((r) => r.endpoint)).toEqual([
      'abandon',
      'start',
    ])
    await expectStats(page, { score: '2', streak: 0, wins: 3, losses: 2, draws: 0 })
  })
})
