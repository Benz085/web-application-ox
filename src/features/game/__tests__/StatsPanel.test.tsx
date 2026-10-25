import '@/web-app-ox/test/setup'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeProfile } from '@/web-app-ox/test/fixtures'
import StatsPanel from '@/web-app-ox/features/game/StatsPanel'

describe('StatsPanel (AC-17, UI-2)', () => {
  it('renders nothing without a profile', () => {
    const { container } = render(<StatsPanel profile={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows score, streak x/3 and W/L/D', () => {
    render(<StatsPanel profile={makeProfile({ score: -2, streak: 1, wins: 6, losses: 8, draws: 3 })} />)
    expect(screen.getByRole('heading', { name: 'Your stats' })).toBeInTheDocument()
    expect(screen.getByText('-2')).toBeInTheDocument()
    expect(screen.getByText('1/3')).toBeInTheDocument()
    const record = screen.getByText('Wins').closest('dl') as HTMLElement
    expect(within(record).getByText('Wins').nextElementSibling).toHaveTextContent('6')
    expect(within(record).getByText('Losses').nextElementSibling).toHaveTextContent('8')
    expect(within(record).getByText('Draws').nextElementSibling).toHaveTextContent('3')
  })

  it.each([
    [0, 'Win 3 in a row for a +1 bonus'],
    [1, '2 more wins in a row for a +1 bonus'],
    [2, '1 more win in a row for a +1 bonus'],
  ])('streak %d hints "%s" and lights %d dots', (streak, hint) => {
    const { container } = render(<StatsPanel profile={makeProfile({ streak })} />)
    expect(screen.getByText(hint)).toBeInTheDocument()
    expect(container.querySelectorAll('.stats__dot')).toHaveLength(3)
    expect(container.querySelectorAll('.stats__dot--on')).toHaveLength(streak)
    expect(container.querySelector('.stats__dots')).toHaveAttribute('aria-hidden', 'true')
  })

  it('clamps a streak above 3 to 3/3', () => {
    const { container } = render(<StatsPanel profile={makeProfile({ streak: 5 })} />)
    expect(screen.getByText('3/3')).toBeInTheDocument()
    expect(container.querySelectorAll('.stats__dot--on')).toHaveLength(3)
  })
})
