import '@/web-app-ox/test/setup'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGet } from '@/web-app-ox/api/client'
import { deferred, makeAdminPlayer } from '@/web-app-ox/test/fixtures'
import { ADMIN, renderAt } from '@/web-app-ox/test/render'
import type { AdminPlayer } from '../../../../shared/types'
import AdminPage from '@/web-app-ox/features/admin/AdminPage'

vi.mock('@/web-app-ox/api/client', () => ({ apiGet: vi.fn() }))
const mockedGet = vi.mocked(apiGet)

const LAST = new Date(2025, 2, 9, 8, 5).toISOString()

const players = [
  makeAdminPlayer({ uid: 'u1', email: 'low@x.test', score: -2, streak: 0, wins: 1, losses: 4, draws: 0, lastPlayedAt: LAST }),
  makeAdminPlayer({ uid: 'u2', email: 'top@x.test', score: 9, streak: 2, wins: 10, losses: 1, draws: 3, lastPlayedAt: null }),
  makeAdminPlayer({ uid: 'u3', email: 'mid@x.test', score: 3, streak: 1, wins: 4, losses: 2, draws: 1, lastPlayedAt: LAST }),
]

async function show(list: AdminPlayer[] = players) {
  mockedGet.mockResolvedValue({ players: list })
  const view = renderAt(<AdminPage />, { route: '/admin', auth: ADMIN })
  const table = await screen.findByRole('table', { name: 'All players' })
  return { ...view, table }
}

const bodyEmails = (table: HTMLElement) =>
  within(table)
    .getAllByRole('rowheader')
    .map((h) => h.textContent)

const header = (table: HTMLElement, name: string) => within(table).getByRole('columnheader', { name: new RegExp(name) })

beforeEach(() => {
  vi.resetAllMocks()
})

describe('AdminPage table (AC-19, UI-7)', () => {
  it('requests /api/admin/players and shows all columns including email', async () => {
    const { table } = await show()
    expect(mockedGet).toHaveBeenCalledWith('/api/admin/players', expect.any(AbortSignal))
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent?.replace(/[▲▼↕]/g, ''))).toEqual([
      'Email',
      'Score',
      'Streak',
      'Wins',
      'Losses',
      'Draws',
      'Last played',
    ])
    const row = within(table).getByRole('row', { name: /mid@x.test/ })
    expect(within(row).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      '3',
      '1/3',
      '4',
      '2',
      '1',
      '2025-03-09 08:05',
    ])
    expect(within(row).getByRole('rowheader')).toHaveTextContent('mid@x.test')
  })

  it('shows an em dash for never-played players and a minus sign for negative scores', async () => {
    const { table } = await show()
    const never = within(table).getByRole('row', { name: /top@x.test/ })
    expect(within(never).getAllByRole('cell').at(-1)).toHaveTextContent('—')
    const neg = within(within(table).getByRole('row', { name: /low@x.test/})).getByText('−2')
    expect(neg).toHaveClass('neg')
  })

  it('defaults to score descending and shows the player count', async () => {
    const { table } = await show()
    expect(bodyEmails(table)).toEqual(['top@x.test', 'mid@x.test', 'low@x.test'])
    expect(header(table, 'Score')).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByText(/3 players/)).toBeInTheDocument()
    expect(screen.getByText('Visible to admins only')).toBeInTheDocument()
  })

  it('uses singular for one player', async () => {
    await show([players[0]])
    expect(screen.getByText(/1 player$/)).toBeInTheDocument()
  })
})

describe('AdminPage sorting', () => {
  it('exposes aria-sort on every header: none except the active one', async () => {
    const { table } = await show()
    for (const name of ['Email', 'Streak', 'Wins', 'Losses', 'Draws', 'Last played']) {
      expect(header(table, name)).toHaveAttribute('aria-sort', 'none')
    }
    expect(header(table, 'Score')).toHaveAttribute('aria-sort', 'descending')
  })

  it('sorts a numeric column high to low first, then toggles', async () => {
    const { table } = await show()
    await userEvent.click(within(header(table, 'Wins')).getByRole('button'))
    expect(header(table, 'Wins')).toHaveAttribute('aria-sort', 'descending')
    expect(header(table, 'Score')).toHaveAttribute('aria-sort', 'none')
    expect(bodyEmails(table)).toEqual(['top@x.test', 'mid@x.test', 'low@x.test'])
    await userEvent.click(within(header(table, 'Wins')).getByRole('button'))
    expect(header(table, 'Wins')).toHaveAttribute('aria-sort', 'ascending')
    expect(bodyEmails(table)).toEqual(['low@x.test', 'mid@x.test', 'top@x.test'])
    await userEvent.click(within(header(table, 'Wins')).getByRole('button'))
    expect(header(table, 'Wins')).toHaveAttribute('aria-sort', 'descending')
  })

  it('sorts email ascending first', async () => {
    const { table } = await show()
    await userEvent.click(within(header(table, 'Email')).getByRole('button'))
    expect(header(table, 'Email')).toHaveAttribute('aria-sort', 'ascending')
    expect(bodyEmails(table)).toEqual(['low@x.test', 'mid@x.test', 'top@x.test'])
  })

  it('shows direction icons on the active header only', async () => {
    const { table } = await show()
    expect(header(table, 'Score')).toHaveTextContent('▼')
    expect(header(table, 'Email')).toHaveTextContent('↕')
    await userEvent.click(within(header(table, 'Score')).getByRole('button'))
    expect(header(table, 'Score')).toHaveTextContent('▲')
    expect(within(header(table, 'Score')).getByRole('button')).toHaveClass('is-active')
    expect(within(header(table, 'Email')).getByRole('button')).not.toHaveClass('is-active')
  })

  it('sorts via the mobile select and keeps the table in sync', async () => {
    const { table } = await show()
    const select = screen.getByLabelText('Sort by')
    expect(select).toHaveValue('score:desc')
    expect(within(select).getAllByRole('option')).toHaveLength(14)
    await userEvent.selectOptions(select, 'email:asc')
    expect(select).toHaveValue('email:asc')
    expect(bodyEmails(table)).toEqual(['low@x.test', 'mid@x.test', 'top@x.test'])
    expect(header(table, 'Email')).toHaveAttribute('aria-sort', 'ascending')
    await userEvent.selectOptions(select, 'Wins (low to high)')
    expect(bodyEmails(table)).toEqual(['low@x.test', 'mid@x.test', 'top@x.test'])
  })
})

describe('AdminPage mobile cards', () => {
  it('renders one card per player with email, stats and last played', async () => {
    await show()
    const list = screen.getByRole('list', { name: 'Players' })
    const cards = within(list).getAllByRole('listitem')
    expect(cards).toHaveLength(3)
    expect(cards[0]).toHaveTextContent('top@x.test')
    expect(cards[0]).toHaveTextContent('Streak2/3')
    expect(cards[0]).toHaveTextContent('W / L / D10 / 1 / 3')
    expect(cards[0]).toHaveTextContent('Last played —')
    expect(cards[1]).toHaveTextContent('Last played 2025-03-09 08:05')
    expect(within(cards[2]).getByText('−2')).toHaveClass('neg')
    expect(within(cards[0]).getByText('9')).not.toHaveClass('neg')
  })
})

describe('AdminPage states (UI-9)', () => {
  it('shows loading first', () => {
    mockedGet.mockReturnValue(deferred<{ players: AdminPlayer[] }>().promise)
    renderAt(<AdminPage />, { auth: ADMIN })
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an alert on failure and retries', async () => {
    mockedGet.mockRejectedValueOnce(new Error('x'))
    renderAt(<AdminPage />, { auth: ADMIN })
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reach the server. Try again.")
    expect(screen.queryByText(/\d+ players?$/)).not.toBeInTheDocument()
    mockedGet.mockResolvedValueOnce({ players })
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the empty state with no table', async () => {
    mockedGet.mockResolvedValue({ players: [] })
    renderAt(<AdminPage />, { auth: ADMIN })
    expect(await screen.findByRole('heading', { name: 'No players yet' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Sort by')).not.toBeInTheDocument()
  })

  it('ignores a failure after unmount (aborted request)', async () => {
    const gate = deferred<{ players: AdminPlayer[] }>()
    mockedGet.mockReturnValue(gate.promise)
    const view = renderAt(<AdminPage />, { auth: ADMIN })
    const signal = mockedGet.mock.calls[0][1] as AbortSignal
    view.unmount()
    expect(signal.aborted).toBe(true)
    gate.reject(new Error('late'))
    await Promise.resolve()
  })
})
