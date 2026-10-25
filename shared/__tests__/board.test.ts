import { describe, expect, it } from 'vitest'
import {
  BOARD_SIZE,
  WIN_LINES,
  applyMove,
  isDraw,
  isLegalMove,
  isOver,
  legalMoves,
  newBoard,
  winner,
} from '../board.js'
import type { Board, Mark } from '../types.js'

describe('board', () => {
  it('newBoard is 9 empty cells', () => {
    const b = newBoard()
    expect(b).toHaveLength(BOARD_SIZE)
    expect(b.every((c) => c === null)).toBe(true)
    expect(legalMoves(b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(isOver(b)).toBe(false)
  })

  it('has exactly 8 win lines', () => {
    expect(WIN_LINES).toHaveLength(8)
  })

  describe.each<Mark>(['X', 'O'])('win detection for %s', (mark) => {
    it.each(WIN_LINES.map((l) => [l.join('-'), l] as const))('line %s', (_name, line) => {
      const b = newBoard()
      for (const i of line) b[i] = mark
      expect(winner(b)).toBe(mark)
      expect(isDraw(b)).toBe(false)
      expect(isOver(b)).toBe(true)
    })
  })

  it('two in a line is not a win; mixed line is not a win', () => {
    const b = newBoard()
    b[0] = 'X'
    b[1] = 'X'
    expect(winner(b)).toBeNull()
    b[2] = 'O'
    expect(winner(b)).toBeNull()
    expect(isOver(b)).toBe(false)
  })

  it('full board with no line is a draw', () => {
    // X O X / X O O / O X X
    const b: Board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']
    expect(winner(b)).toBeNull()
    expect(isDraw(b)).toBe(true)
    expect(isOver(b)).toBe(true)
    expect(legalMoves(b)).toEqual([])
  })

  it('full board with a winner is not a draw', () => {
    const b: Board = ['X', 'X', 'X', 'O', 'O', 'X', 'X', 'O', 'O']
    expect(winner(b)).toBe('X')
    expect(isDraw(b)).toBe(false)
  })

  describe('illegal moves', () => {
    const b = applyMove(newBoard(), 4, 'X')
    it.each([
      ['occupied', 4],
      ['negative', -1],
      ['too large', 9],
      ['fractional', 1.5],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['string', '1'],
      ['null', null],
      ['undefined', undefined],
    ])('%s is rejected', (_n, cell) => {
      expect(isLegalMove(b, cell)).toBe(false)
      expect(() => applyMove(b, cell as number, 'O')).toThrow('Illegal move')
    })

    it('empty in-range integer is legal', () => {
      expect(isLegalMove(b, 0)).toBe(true)
      expect(isLegalMove(b, 8)).toBe(true)
    })
  })

  it('applyMove is immutable', () => {
    const b = newBoard()
    const snapshot = [...b]
    const next = applyMove(b, 3, 'O')
    expect(b).toEqual(snapshot)
    expect(next).not.toBe(b)
    expect(next[3]).toBe('O')
    expect(legalMoves(next)).not.toContain(3)
  })
})
