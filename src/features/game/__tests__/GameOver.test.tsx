import '@/web-app-ox/test/setup'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeGame } from '@/web-app-ox/test/fixtures'
import type { Game } from '../../../../shared/types'
import GameOver from '@/web-app-ox/features/game/GameOver'

function setup(game: Game, props: Partial<React.ComponentProps<typeof GameOver>> = {}) {
  const onPlayAgain = vi.fn()
  const onChangeDifficulty = vi.fn()
  render(
    <GameOver
      game={game}
      winLine={null}
      streak={1}
      onPlayAgain={onPlayAgain}
      onChangeDifficulty={onChangeDifficulty}
      disabled={false}
      {...props}
    />,
  )
  return { onPlayAgain, onChangeDifficulty }
}

const delta = (text: string) => screen.getByLabelText(`Score change ${text}`)

describe('GameOver variants (UI-4)', () => {
  it('win (+1)', () => {
    setup(makeGame({ status: 'won', result: { scoreDelta: 1, bonus: false } }), { winLine: [0, 1, 2], streak: 2 })
    expect(screen.getByRole('heading', { name: 'You win!' })).toBeInTheDocument()
    expect(screen.getByText('You got three X in the top row.')).toBeInTheDocument()
    expect(delta('+1')).toHaveTextContent('+1')
    expect(screen.getByText('+1 point for the win.')).toBeInTheDocument()
    expect(screen.getByText('Win streak is now 2/3.')).toBeInTheDocument()
  })

  it('win shows "?" when the streak is unknown', () => {
    setup(makeGame({ status: 'won', result: { scoreDelta: 1, bonus: false } }), { winLine: [0, 4, 8], streak: null })
    expect(screen.getByText('Win streak is now ?/3.')).toBeInTheDocument()
  })

  it('win with bonus (+2, streak back to 0/3)', () => {
    setup(makeGame({ status: 'won', result: { scoreDelta: 2, bonus: true } }), { winLine: [2, 5, 8], streak: 0 })
    expect(screen.getByRole('heading', { name: '3 wins in a row!' })).toBeInTheDocument()
    expect(delta('+2')).toHaveTextContent('+2')
    expect(screen.getByText('+1 for the win, +1 streak bonus.')).toBeInTheDocument()
    expect(screen.getByText('Win streak starts again at 0/3.')).toBeInTheDocument()
  })

  it('loss (−1)', () => {
    setup(makeGame({ status: 'lost', result: { scoreDelta: -1, bonus: false } }), { winLine: [0, 3, 6] })
    expect(screen.getByRole('heading', { name: 'You lose' })).toBeInTheDocument()
    expect(screen.getByText('The bot got three O in the left column.')).toBeInTheDocument()
    expect(delta('−1')).toHaveTextContent('−1')
    expect(screen.getByText('−1 point for the loss.')).toBeInTheDocument()
    expect(screen.getByText('Win streak resets to 0/3.')).toBeInTheDocument()
  })

  it('loss without a win line (abandoned game)', () => {
    setup(makeGame({ status: 'lost', result: { scoreDelta: -1, bonus: false } }))
    expect(screen.getByText('The game ended as a loss.')).toBeInTheDocument()
  })

  it('draw (0)', () => {
    setup(makeGame({ status: 'draw', result: { scoreDelta: 0, bonus: false } }))
    expect(screen.getByRole('heading', { name: "It's a draw" })).toBeInTheDocument()
    expect(screen.getByText('The board is full and nobody got three in a row.')).toBeInTheDocument()
    expect(delta('0')).toHaveTextContent('0')
    expect(screen.getByText('No points this game.')).toBeInTheDocument()
    expect(screen.getByText('Win streak resets to 0/3.')).toBeInTheDocument()
  })
})

describe('GameOver score fallback without result', () => {
  it.each([
    ['won', '+1'],
    ['lost', '−1'],
    ['draw', '0'],
  ] as const)('derives the delta for %s', (status, text) => {
    setup(makeGame({ status }), { winLine: status === 'draw' ? null : [0, 1, 2] })
    expect(delta(text)).toBeInTheDocument()
  })
})

describe('GameOver line names', () => {
  it.each([
    [[0, 1, 2], 'in the top row'],
    [[3, 4, 5], 'in the middle row'],
    [[6, 7, 8], 'in the bottom row'],
    [[0, 3, 6], 'in the left column'],
    [[1, 4, 7], 'in the middle column'],
    [[2, 5, 8], 'in the right column'],
    [[0, 4, 8], 'in a diagonal'],
    [[2, 4, 6], 'in a diagonal'],
  ])('%j -> %s', (line, name) => {
    setup(makeGame({ status: 'won' }), { winLine: line })
    expect(screen.getByText(`You got three X ${name}.`)).toBeInTheDocument()
  })

  it('omits the position for an unknown line', () => {
    setup(makeGame({ status: 'won' }), { winLine: [0, 1] })
    expect(screen.getByText('You got three X .')).toBeInTheDocument()
  })
})

describe('GameOver actions', () => {
  it('fires Play again and Change difficulty', async () => {
    const { onPlayAgain, onChangeDifficulty } = setup(makeGame({ status: 'draw' }))
    await userEvent.click(screen.getByRole('button', { name: 'Play again' }))
    await userEvent.click(screen.getByRole('button', { name: 'Change difficulty' }))
    expect(onPlayAgain).toHaveBeenCalledTimes(1)
    expect(onChangeDifficulty).toHaveBeenCalledTimes(1)
  })

  it('disables both buttons when disabled', () => {
    setup(makeGame({ status: 'draw' }), { disabled: true })
    expect(screen.getByRole('button', { name: 'Play again' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Change difficulty' })).toBeDisabled()
  })

  it('forwards the ref to the focusable title', () => {
    const ref = createRef<HTMLHeadingElement>()
    render(
      <GameOver
        ref={ref}
        game={makeGame({ status: 'draw' })}
        winLine={null}
        streak={0}
        onPlayAgain={vi.fn()}
        onChangeDifficulty={vi.fn()}
        disabled={false}
      />,
    )
    expect(ref.current).toBe(screen.getByRole('heading', { name: "It's a draw" }))
    expect(ref.current).toHaveAttribute('tabindex', '-1')
  })
})
