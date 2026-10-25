import '@/web-app-ox/test/setup'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGet } from '@/web-app-ox/api/client'
import { deferred, makeEntry, makeProfile } from '@/web-app-ox/test/fixtures'
import { renderAt } from '@/web-app-ox/test/render'
import type { LeaderboardEntry } from '../../../../shared/types'
import LeaderboardPage from '@/web-app-ox/features/leaderboard/LeaderboardPage'

vi.mock('@/web-app-ox/api/client', () => ({ apiGet: vi.fn() }))
const mockedGet = vi.mocked(apiGet)

type Auth = Parameters<typeof renderAt>[1]

function show(players: LeaderboardEntry[], auth: Auth = {}) {
  mockedGet.mockResolvedValue({ players })
  return renderAt(<LeaderboardPage />, { route: '/leaderboard', ...auth })
}

const rowOf = (name: string) => screen.getByRole('row', { name: new RegExp(name) })

beforeEach(() => {
  vi.resetAllMocks()
})

describe('LeaderboardPage rows (AC-18, UI-6)', () => {
  it('requests the leaderboard and lists rank, name, score and W/L/D', async () => {
    show([
      makeEntry({ rank: 1, displayName: 'Sam Rivers', score: 10, wins: 12, losses: 2, draws: 0 }),
      makeEntry({ rank: 2, displayName: 'Kim Lee', score: 5, wins: 7, losses: 1, draws: 3 }),
    ])
    expect(await screen.findByRole('table', { name: 'Players ranked by score' })).toBeInTheDocument()
    expect(mockedGet).toHaveBeenCalledWith('/api/leaderboard', expect.any(AbortSignal))
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Rank',
      'Player',
      'Score',
      'WinsW',
      'LossesL',
      'DrawsD',
    ])
    const kim = within(rowOf('Kim Lee')).getAllByRole('cell').map((c) => c.textContent)
    expect(kim).toEqual(['2', '5', '7', '1', '3'])
    expect(screen.getByText('2 players')).toBeInTheDocument()
  })

  it('uses singular for one player', async () => {
    show([makeEntry()])
    expect(await screen.findByText('1 player')).toBeInTheDocument()
  })

  it('renders the medal classes for ranks 1-3 only', async () => {
    show([1, 2, 3, 4].map((rank) => makeEntry({ rank, displayName: `P${rank}` })))
    await screen.findByRole('table')
    expect(screen.getByText('1', { selector: '.rank' })).toHaveClass('rank--gold')
    expect(screen.getByText('2', { selector: '.rank' })).toHaveClass('rank--silver')
    expect(screen.getByText('3', { selector: '.rank' })).toHaveClass('rank--bronze')
    expect(screen.getByText('4', { selector: '.rank' }).className).toBe('rank')
  })

  it('shows negative scores with a minus sign and the neg class', async () => {
    show([makeEntry({ score: -3 })])
    const cell = await screen.findByText('−3')
    expect(cell).toHaveClass('neg')
  })

  it('shows a photo when there is one and initials otherwise', async () => {
    const { container } = show([
      makeEntry({ rank: 1, displayName: 'Sam Rivers', photoURL: 'https://img.example.test/s.png' }),
      makeEntry({ rank: 2, displayName: 'Kim Lee' }),
      makeEntry({ rank: 3, displayName: 'cher' }),
    ])
    await screen.findByRole('table')
    expect(container.querySelector('img.avatar')).toHaveAttribute('src', 'https://img.example.test/s.png')
    expect(within(rowOf('Kim Lee')).getByText('KL')).toBeInTheDocument()
    expect(within(rowOf('cher')).getByText('CH')).toBeInTheDocument()
  })

  it('shows the loading state first', async () => {
    const gate = deferred<{ players: LeaderboardEntry[] }>()
    mockedGet.mockReturnValue(gate.promise)
    renderAt(<LeaderboardPage />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders an initials fallback "?" for a blank display name', async () => {
    show([makeEntry({ displayName: '' })])
    await screen.findByRole('table')
    expect(screen.getByText('?')).toBeInTheDocument()
  })
})

describe('LeaderboardPage "You" row', () => {
  const players = [
    makeEntry({ rank: 1, displayName: 'Sam Rivers', score: 10 }),
    makeEntry({ rank: 2, displayName: 'Alex Morgan', score: 4, wins: 6, losses: 2, draws: 1 }),
  ]

  it('marks the current user row with the You tag and aria-current', async () => {
    show(players, { auth: { profile: makeProfile() } })
    await screen.findByRole('table')
    const mine = rowOf('Alex Morgan')
    expect(mine).toHaveAttribute('aria-current', 'true')
    expect(mine).toHaveClass('is-you')
    expect(within(mine).getByText('You')).toBeInTheDocument()
    expect(rowOf('Sam Rivers')).not.toHaveAttribute('aria-current')
    expect(screen.getAllByText('You')).toHaveLength(1)
  })

  it('picks the exact stats match among players with the same name and photo', async () => {
    show(
      [
        makeEntry({ rank: 1, displayName: 'Alex Morgan', score: 9, wins: 9 }),
        makeEntry({ rank: 2, displayName: 'Alex Morgan', score: 4, wins: 6, losses: 2, draws: 1 }),
      ],
      { auth: { profile: makeProfile() } },
    )
    await screen.findByRole('table')
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).not.toHaveAttribute('aria-current')
    expect(rows[1]).toHaveAttribute('aria-current', 'true')
  })

  it('falls back to the first same-name player when stats differ', async () => {
    show(
      [
        makeEntry({ rank: 1, displayName: 'Alex Morgan', score: 9, wins: 9 }),
        makeEntry({ rank: 2, displayName: 'Alex Morgan', score: 8, wins: 8 }),
      ],
      { auth: { profile: makeProfile() } },
    )
    await screen.findByRole('table')
    expect(screen.getAllByRole('row').slice(1)[0]).toHaveAttribute('aria-current', 'true')
  })

  it('does not match a same-name player with a different photo', async () => {
    show([makeEntry({ displayName: 'Alex Morgan', photoURL: 'https://img.example.test/other.png' })], {
      auth: { profile: makeProfile() },
    })
    await screen.findByRole('table')
    expect(screen.queryByText('You')).not.toBeInTheDocument()
  })

  it('shows no You tag without a profile or when the user is not listed', async () => {
    show(players)
    await screen.findByRole('table')
    expect(screen.queryByText('You')).not.toBeInTheDocument()
  })

  it('shows no You tag when the profile name is not on the board', async () => {
    show(players, { auth: { profile: makeProfile({ displayName: 'Nobody' }) } })
    await screen.findByRole('table')
    expect(screen.queryByText('You')).not.toBeInTheDocument()
  })
})

describe('LeaderboardPage never exposes email (AC-18)', () => {
  it('renders no email even if the payload had one, and has no email column', async () => {
    const leaky = { ...makeEntry({ displayName: 'Sam Rivers' }), email: 'secret.sam@example.test' }
    const { container } = show([leaky])
    await screen.findByRole('table')
    expect(container.textContent).not.toContain('secret.sam@example.test')
    expect(container.textContent).not.toContain('@')
    expect(screen.queryByRole('columnheader', { name: /email/i })).not.toBeInTheDocument()
  })
})

describe('LeaderboardPage empty and error states (UI-9)', () => {
  it('shows the empty state with a link to play', async () => {
    show([])
    expect(await screen.findByRole('heading', { name: 'No players yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Play a game' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an alert on failure and retries', async () => {
    mockedGet.mockRejectedValueOnce(new Error('down'))
    renderAt(<LeaderboardPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reach the server. Try again.")
    mockedGet.mockResolvedValueOnce({ players: [makeEntry()] })
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(mockedGet).toHaveBeenCalledTimes(2)
  })

  it('aborts the request on unmount without showing an error', async () => {
    const gate = deferred<{ players: LeaderboardEntry[] }>()
    mockedGet.mockReturnValue(gate.promise)
    const view = renderAt(<LeaderboardPage />)
    const signal = mockedGet.mock.calls[0][1] as AbortSignal
    view.unmount()
    expect(signal.aborted).toBe(true)
    gate.reject(new Error('late'))
  })

  it('ignores a failure that arrives after the request was aborted', async () => {
    const first = deferred<{ players: LeaderboardEntry[] }>()
    mockedGet.mockReturnValueOnce(first.promise)
    mockedGet.mockResolvedValueOnce({ players: [makeEntry()] })
    mockedGet.mockResolvedValue({ players: [makeEntry()] })
    const view = renderAt(<LeaderboardPage />)
    view.unmount()
    first.reject(new Error('late'))
    await Promise.resolve()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
