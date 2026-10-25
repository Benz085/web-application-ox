import { expect, type Locator, type Page } from '@playwright/test'
import type { MockApi } from './mockApi.ts'

export type E2eUser = 'player' | 'admin' | 'none'

export async function gotoAs(page: Page, user: E2eUser, path = '/'): Promise<void> {
  const sep = path.includes('?') ? '&' : '?'
  await page.goto(`${path}${sep}e2eUser=${user}`)
}

/** Board cell by index 0..8 (label "Row r, column c, <empty|X|O>"). */
export function cell(page: Page, index: number): Locator {
  const row = Math.floor(index / 3) + 1
  const col = (index % 3) + 1
  return page.getByRole('button', { name: new RegExp(`^Row ${row}, column ${col},`) })
}

export function board(page: Page): Locator {
  return page.getByRole('group', { name: 'Game board' })
}

export function stats(page: Page): Locator {
  return page.getByRole('region', { name: 'Your stats' })
}

export interface ExpectedStats {
  score: string
  streak: number
  wins: number
  losses: number
  draws: number
}

/** Score uses the typographic minus (U+2212) for negatives, as in the mockups. */
export async function expectStats(page: Page, expected: ExpectedStats): Promise<void> {
  const region = stats(page)
  await expect(region).toContainText(`Score${expected.score}Win streak${expected.streak}/3`)
  await expect(region).toContainText(`Wins${expected.wins}Losses${expected.losses}Draws${expected.draws}`)
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth'))
    .toBeLessThanOrEqual(0)
}

export async function startGame(page: Page, difficulty?: 'easy' | 'hard'): Promise<void> {
  if (difficulty) {
    await page.getByRole('radio', { name: difficulty === 'hard' ? /^Hard/ : /^Easy/ }).click()
  }
  await page.getByRole('button', { name: 'Start game' }).click()
  await expect(board(page)).toBeVisible()
  await expect(page.getByText('Your turn', { exact: true })).toBeVisible()
}

/** One player move; when `botCell` is given, waits until the bot's O appears there. */
export async function play(page: Page, playerCell: number, botCell?: number): Promise<void> {
  await cell(page, playerCell).click()
  if (botCell !== undefined) {
    await expect(cell(page, botCell)).toHaveAccessibleName(/, O$/)
    await expect(page.getByText('Your turn', { exact: true })).toBeVisible()
  }
}

/** Win with the main diagonal (0, 4, 8). Needs a fresh empty board. */
export async function playWin(page: Page, api: MockApi): Promise<void> {
  api.botMoves = [1, 2]
  await play(page, 0, 1)
  await play(page, 4, 2)
  await play(page, 8)
  await expect(page.getByRole('heading', { name: /^(You win!|3 wins in a row!)$/ })).toBeVisible()
}

/** Lose: bot gets the middle column (1, 4, 7). */
export async function playLoss(page: Page, api: MockApi): Promise<void> {
  api.botMoves = [1, 4, 7]
  await play(page, 0, 1)
  await play(page, 2, 4)
  await play(page, 3)
  await expect(page.getByRole('heading', { name: 'You lose', exact: true })).toBeVisible()
}

/** Draw: X 0,2,3,7,8 vs O 1,4,5,6 (no line for either side). */
export async function playDraw(page: Page, api: MockApi): Promise<void> {
  api.botMoves = [1, 4, 5, 6]
  await play(page, 0, 1)
  await play(page, 2, 4)
  await play(page, 3, 5)
  await play(page, 7, 6)
  await play(page, 8)
  await expect(page.getByRole('heading', { name: "It's a draw" })).toBeVisible()
}

const ACTIVE_LABEL = '(document.activeElement && document.activeElement.getAttribute("aria-label")) || ""'

/** Presses Tab (max 12 times) until the given board cell has focus. */
export async function tabToCell(page: Page, index: number): Promise<void> {
  const prefix = `Row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1},`
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    if (((await page.evaluate(ACTIVE_LABEL)) as string).startsWith(prefix)) return
  }
}

export async function boardHasFocus(page: Page): Promise<boolean> {
  return ((await page.evaluate(ACTIVE_LABEL)) as string).startsWith('Row ')
}
