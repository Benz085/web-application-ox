import { test, expect } from './helpers/fixtures.ts'
import { board, boardHasFocus, cell, expectStats, gotoAs, play, startGame, tabToCell } from './helpers/ui.ts'

const SERVER_ERROR = "Couldn't reach the server. Try again."

test.describe('S2 play vs bot', () => {
  test('TC-17 setup default state for a new player', async ({ page }) => {
    await gotoAs(page, 'player', '/')
    await expect(page.getByRole('heading', { name: 'New game' })).toBeVisible()
    await expectStats(page, { score: '0', streak: 0, wins: 0, losses: 0, draws: 0 })
    const easy = page.getByRole('radio', { name: /^Easy/ })
    const hard = page.getByRole('radio', { name: /^Hard/ })
    await expect(easy).toHaveAttribute('aria-checked', 'true')
    await expect(hard).toHaveAttribute('aria-checked', 'false')
    await expect(page.getByRole('button', { name: 'Start game' })).toBeEnabled()
    await expect(page.getByRole('region', { name: 'Your stats' }).getByText('Wins', { exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Your stats' }).getByText('Losses', { exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Your stats' }).getByText('Draws', { exact: true })).toBeVisible()
  })

  test('TC-18 setup preselects the last played difficulty', async ({ page }) => {
    await page.addInitScript("window.localStorage.setItem('ox:lastDifficulty', 'hard')")
    await gotoAs(page, 'player', '/')
    await expect(page.getByRole('radio', { name: /^Hard/ })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('radio', { name: /^Easy/ })).toHaveAttribute('aria-checked', 'false')
  })

  test('TC-19 setup loading state disables the controls', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await expect(page.getByRole('heading', { name: 'New game' })).toBeVisible()
    const release = api.hold('start')
    await page.getByRole('button', { name: 'Start game' }).click()
    await expect(page.getByRole('button', { name: 'Starting…' })).toBeDisabled()
    await expect(page.getByRole('radio', { name: /^Easy/ })).toBeDisabled()
    await expect(page.getByRole('radio', { name: /^Hard/ })).toBeDisabled()
    release()
    await expect(board(page)).toBeVisible()
  })

  test('TC-20 start creates an empty board and the player moves first', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await page.getByRole('radio', { name: /^Hard/ }).click()
    await page.getByRole('button', { name: 'Start game' }).click()
    await expect(board(page)).toBeVisible()
    expect(api.bodies('start')).toEqual([{ difficulty: 'hard' }])
    await expect(page.getByText('Your turn', { exact: true })).toBeVisible()
    await expect(page.getByText(/Difficulty: Hard/)).toBeVisible()
    await expect(page.getByText(/You are X/)).toBeVisible()
    for (let i = 0; i < 9; i++) {
      await expect(cell(page, i)).toHaveAttribute('aria-disabled', 'false')
      await expect(cell(page, i)).toHaveAccessibleName(/, empty$/)
    }
  })

  test('TC-21 board cells are labelled buttons', async ({ page }) => {
    await gotoAs(page, 'player', '/')
    await startGame(page)
    await expect(board(page).getByRole('button')).toHaveCount(9)
    for (let i = 0; i < 9; i++) {
      await expect(cell(page, i)).toHaveAccessibleName(`Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}, empty`)
    }
    await play(page, 3, 0)
    await expect(cell(page, 3)).toHaveAccessibleName('Row 2, column 1, X')
    await expect(cell(page, 0)).toHaveAccessibleName('Row 1, column 1, O')
    await expect(cell(page, 4)).toHaveAccessibleName('Row 2, column 2, empty')
  })

  test('TC-22 keyboard play with arrows, Enter and Space', async ({ page }) => {
    await gotoAs(page, 'player', '/')
    await startGame(page)
    const first = cell(page, 0)
    await tabToCell(page, 0)
    await expect(first).toBeFocused()

    // edges do not wrap
    await page.keyboard.press('ArrowUp')
    await expect(first).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(first).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(cell(page, 1)).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(cell(page, 4)).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(cell(page, 3)).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(cell(page, 0)).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect(cell(page, 6)).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(cell(page, 6)).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await expect(cell(page, 8)).toBeFocused()

    // Enter plays X on cell 8 (bot takes the first empty cell, 0)
    await page.keyboard.press('Enter')
    await expect(cell(page, 8)).toHaveAccessibleName(/, X$/)
    await expect(cell(page, 0)).toHaveAccessibleName(/, O$/)
    await expect(page.getByText('Your turn', { exact: true })).toBeVisible()

    // Space plays X on another cell
    await page.keyboard.press('ArrowUp')
    await expect(cell(page, 5)).toBeFocused()
    await page.keyboard.press('Space')
    await expect(cell(page, 5)).toHaveAccessibleName(/, X$/)
    await expect(cell(page, 1)).toHaveAccessibleName(/, O$/)
  })

  test('TC-24 move gets one bot reply and the board is locked while thinking', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await startGame(page)
    const release = api.hold('move')
    await cell(page, 4).click()
    await expect(page.getByText('Bot is thinking…')).toBeVisible()
    await expect(page.getByText(/The board is locked until the bot moves/)).toBeVisible()
    for (let i = 0; i < 9; i++) {
      await expect(cell(page, i)).toHaveAttribute('aria-disabled', 'true')
    }
    release()
    await expect(cell(page, 4)).toHaveAccessibleName(/, X$/)
    await expect(cell(page, 0)).toHaveAccessibleName(/, O$/)
    await expect(page.getByText('Your turn', { exact: true })).toBeVisible()
    await expect(cell(page, 1)).toHaveAttribute('aria-disabled', 'false')
    expect(api.count('move')).toBe(1)
  })

  test('TC-25 status text is an aria-live polite region', async ({ page }) => {
    await gotoAs(page, 'player', '/')
    await startGame(page)
    const status = page.locator('[aria-live="polite"]')
    await expect(status).toHaveCount(1)
    await expect(status).toContainText('Your turn')
    await cell(page, 4).click()
    await expect(cell(page, 0)).toHaveAccessibleName(/, O$/)
    await expect(status).toContainText('Your turn')
  })

  test('TC-26 double click sends one move and a click while locked is ignored', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await startGame(page)
    const release = api.hold('move')
    await cell(page, 4).dblclick()
    await expect(page.getByText('Bot is thinking…')).toBeVisible()
    await cell(page, 8).click({ force: true })
    release()
    await expect(cell(page, 0)).toHaveAccessibleName(/, O$/)
    await expect(page.getByText('Your turn', { exact: true })).toBeVisible()
    expect(api.bodies('move')).toHaveLength(1)
    await expect(cell(page, 8)).toHaveAccessibleName(/, empty$/)
  })

  test('TC-29 UI recovers when the server rejects a move', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await startGame(page)
    api.fail('move', { status: 409, code: 'INVALID_MOVE' })
    await cell(page, 4).click()
    // The client re-syncs with the server and explains why the move was refused.
    await expect(page.getByRole('alert')).toContainText('That move is no longer valid')
    await expect(cell(page, 4)).toHaveAccessibleName(/, empty$/)
    await expect(page.getByText('Your turn', { exact: true })).toBeVisible()
    await expect(cell(page, 4)).toHaveAttribute('aria-disabled', 'false')
  })

  test('TC-29 UI recovers when the move request fails on the server (5xx)', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await startGame(page)
    api.fail('move', { status: 500 })
    await cell(page, 4).click()
    await expect(page.getByRole('alert')).toContainText(SERVER_ERROR)
    await expect(cell(page, 4)).toHaveAccessibleName(/, empty$/)
    await expect(cell(page, 4)).toHaveAttribute('aria-disabled', 'false')
  })

  test('TC-41 start failure shows an alert and re-enables the controls', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await expect(page.getByRole('heading', { name: 'New game' })).toBeVisible()
    api.fail('start', { status: 500 })
    await page.getByRole('button', { name: 'Start game' }).click()
    await expect(page.getByRole('alert')).toContainText(SERVER_ERROR)
    await expect(page.getByRole('button', { name: 'Start game' })).toBeEnabled()
    await expect(page.getByRole('radio', { name: /^Easy/ })).toBeEnabled()
    await expect(board(page)).toHaveCount(0)

    api.fail('start', 'abort')
    await page.getByRole('button', { name: 'Start game' }).click()
    await expect(page.getByRole('alert')).toContainText(SERVER_ERROR)
    await expect(board(page)).toHaveCount(0)

    api.fail('start', null)
    await page.getByRole('button', { name: 'Start game' }).click()
    await expect(board(page)).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('TC-42 network error during a move keeps the board and allows a retry', async ({ page, api }) => {
    await gotoAs(page, 'player', '/')
    await startGame(page)
    api.fail('move', 'abort')
    await cell(page, 4).click()
    await expect(page.getByRole('alert')).toContainText(SERVER_ERROR)
    await expect(cell(page, 4)).toHaveAccessibleName(/, empty$/)
    await expect(page.getByText('Your turn', { exact: true })).toBeVisible()

    api.fail('move', null)
    await cell(page, 4).click()
    await expect(cell(page, 4)).toHaveAccessibleName(/, X$/)
    await expect(cell(page, 0)).toHaveAccessibleName(/, O$/)
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('TC-45 admin cannot play: redirected to /admin without a Play link', async ({ page, api }) => {
    await gotoAs(page, 'admin', '/')
    await expect(page).toHaveURL(/\/admin$/)
    const nav = page.getByRole('navigation', { name: 'Main' })
    await expect(nav.getByRole('link', { name: 'Play' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'New game' })).toHaveCount(0)
    expect(api.count('current')).toBe(0)
  })

  test('TC-91 Tab enters the board once and leaves it', async ({ page }) => {
    await gotoAs(page, 'player', '/')
    await startGame(page)
    const first = cell(page, 0)
    await tabToCell(page, 0)
    await expect(first).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(board(page).getByRole('button').first()).not.toBeFocused()
    expect(await boardHasFocus(page)).toBe(false)
    await page.keyboard.press('Shift+Tab')
    await expect(first).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    expect(await boardHasFocus(page)).toBe(false)
  })
})
