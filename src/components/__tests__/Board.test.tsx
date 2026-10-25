import '@/web-app-ox/test/setup'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { board } from '@/web-app-ox/test/fixtures'
import Board from '@/web-app-ox/components/Board'

function setup(cells = '', props: Partial<React.ComponentProps<typeof Board>> = {}) {
  const onPlay = vi.fn()
  const view = render(<Board board={board(cells)} onPlay={onPlay} locked={false} {...props} />)
  return { onPlay, ...view }
}

const cell = (name: string) => screen.getByRole('button', { name })

describe('Board labels (AC-23, UI-3)', () => {
  it('labels every cell with row, column and content', () => {
    setup('XO.......')
    expect(cell('Row 1, column 1, X')).toBeInTheDocument()
    expect(cell('Row 1, column 2, O')).toBeInTheDocument()
    expect(cell('Row 1, column 3, empty')).toBeInTheDocument()
    expect(cell('Row 2, column 1, empty')).toBeInTheDocument()
    expect(cell('Row 3, column 3, empty')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(9)
  })

  it('exposes the board as a labelled group', () => {
    setup()
    expect(screen.getByRole('group', { name: 'Game board' })).toHaveAttribute('aria-busy', 'false')
  })

  it('draws X as a cross and O as a ring (shape, not colour)', () => {
    const { container } = setup('XO.......')
    expect(cell('Row 1, column 1, X').querySelector('.board__mark--x path')).not.toBeNull()
    expect(cell('Row 1, column 2, O').querySelector('.board__mark--o circle')).not.toBeNull()
    expect(cell('Row 1, column 3, empty').querySelector('svg')).toBeNull()
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2)
  })
})

describe('Board play', () => {
  it('plays an empty cell on click', async () => {
    const { onPlay } = setup()
    await userEvent.click(cell('Row 2, column 1, empty'))
    expect(onPlay).toHaveBeenCalledExactlyOnceWith(3)
  })

  it('does not play an occupied cell', async () => {
    const { onPlay } = setup('X........')
    await userEvent.click(cell('Row 1, column 1, X'))
    expect(onPlay).not.toHaveBeenCalled()
    expect(cell('Row 1, column 1, X')).toHaveAttribute('aria-disabled', 'true')
  })

  it('plays with Enter and Space on the focused cell', async () => {
    const { onPlay } = setup()
    cell('Row 1, column 2, empty').focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    expect(onPlay).toHaveBeenNthCalledWith(1, 1)
    expect(onPlay).toHaveBeenNthCalledWith(2, 1)
  })

  it('is locked while the bot is thinking', async () => {
    const { onPlay } = setup('X........', { locked: true })
    expect(screen.getByRole('group', { name: 'Game board' })).toHaveAttribute('aria-busy', 'true')
    expect(cell('Row 1, column 2, empty')).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(cell('Row 1, column 2, empty'))
    cell('Row 1, column 3, empty').focus()
    await userEvent.keyboard('{Enter}')
    expect(onPlay).not.toHaveBeenCalled()
  })

  it('keeps empty cells enabled when unlocked', () => {
    setup()
    expect(cell('Row 1, column 1, empty')).toHaveAttribute('aria-disabled', 'false')
  })
})

describe('Board keyboard navigation (roving tabindex)', () => {
  it('starts with the first empty cell focusable', () => {
    setup('XO.......')
    expect(cell('Row 1, column 3, empty')).toHaveAttribute('tabindex', '0')
    expect(cell('Row 1, column 1, X')).toHaveAttribute('tabindex', '-1')
  })

  it('starts at the first cell when the board is full', () => {
    setup('XOXXOOOXX')
    expect(cell('Row 1, column 1, X')).toHaveAttribute('tabindex', '0')
  })

  it('moves focus with the arrow keys', async () => {
    setup()
    cell('Row 2, column 2, empty').focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(cell('Row 2, column 3, empty')).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(cell('Row 3, column 3, empty')).toHaveFocus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(cell('Row 3, column 2, empty')).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    expect(cell('Row 2, column 2, empty')).toHaveFocus()
    expect(cell('Row 2, column 2, empty')).toHaveAttribute('tabindex', '0')
    expect(cell('Row 3, column 3, empty')).toHaveAttribute('tabindex', '-1')
  })

  it.each([
    ['ArrowUp', 'Row 1, column 2, empty', 'Row 1, column 2, empty'],
    ['ArrowLeft', 'Row 2, column 1, empty', 'Row 2, column 1, empty'],
    ['ArrowRight', 'Row 2, column 3, empty', 'Row 2, column 3, empty'],
    ['ArrowDown', 'Row 3, column 2, empty', 'Row 3, column 2, empty'],
  ])('%s at the edge stays on the same cell', async (key, start, expected) => {
    setup()
    cell(start).focus()
    await userEvent.keyboard(`{${key}}`)
    expect(cell(expected)).toHaveFocus()
  })

  it('moves focus over occupied cells and locked boards too', async () => {
    setup('.X.......', { locked: true })
    cell('Row 1, column 1, empty').focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(cell('Row 1, column 2, X')).toHaveFocus()
  })

  it('ignores other keys', async () => {
    const { onPlay } = setup()
    cell('Row 1, column 1, empty').focus()
    await userEvent.keyboard('a{Tab}')
    expect(onPlay).not.toHaveBeenCalled()
  })

  it('updates the roving tabindex when a cell receives focus by pointer', async () => {
    setup()
    await userEvent.click(cell('Row 3, column 1, empty'))
    expect(cell('Row 3, column 1, empty')).toHaveAttribute('tabindex', '0')
  })
})

describe('Board win line (UI-4)', () => {
  it('highlights winning cells with a strike line, defaulting to the win tone', () => {
    const { container } = setup('XXXOO....', { winLine: [0, 1, 2] })
    expect(cell('Row 1, column 1, X')).toHaveClass('board__cell--win')
    expect(cell('Row 1, column 3, X')).toHaveClass('board__cell--win')
    expect(cell('Row 2, column 1, O')).not.toHaveClass('board__cell--win')
    const strike = container.querySelector('.board__strike')
    expect(strike).toHaveClass('board__strike--win')
    const line = strike?.querySelector('line')
    expect(Number(line?.getAttribute('x1'))).toBeCloseTo(16.67, 1)
    expect(Number(line?.getAttribute('y1'))).toBeCloseTo(16.67, 1)
    expect(Number(line?.getAttribute('x2'))).toBeCloseTo(83.33, 1)
    expect(Number(line?.getAttribute('y2'))).toBeCloseTo(16.67, 1)
  })

  it('uses the loss tone for the bot winning line', () => {
    const { container } = setup('OOOXX.X..', { winLine: [0, 1, 2], winTone: 'loss' })
    expect(cell('Row 1, column 1, O')).toHaveClass('board__cell--loss')
    expect(container.querySelector('.board__strike')).toHaveClass('board__strike--loss')
  })

  it('draws no strike line without a win line', () => {
    const { container } = setup('XXXOO....')
    expect(container.querySelector('.board__strike')).toBeNull()
    expect(cell('Row 1, column 1, X')).not.toHaveClass('board__cell--win')
  })
})
