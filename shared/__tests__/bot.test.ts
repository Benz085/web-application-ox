import { describe, expect, it } from 'vitest'
import { applyMove, isOver, legalMoves, newBoard, winner } from '../board.js'
import {
  DEFAULT_HARD_MISTAKE_RATE,
  EASY_SMART_RATE,
  chooseMove,
  findWinningMove,
  minimaxMove,
  randomMove,
  resolveMistakeRate,
} from '../bot.js'
import type { Board } from '../types.js'

const seq = (...values: number[]) => {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}
const LOW = EASY_SMART_RATE / 2
const HIGH = 0.99

describe('resolveMistakeRate', () => {
  it('keeps valid numbers', () => {
    expect(resolveMistakeRate(0)).toBe(0)
    expect(resolveMistakeRate(0.5)).toBe(0.5)
    expect(resolveMistakeRate(1)).toBe(1)
  })
  it.each([undefined, null, Number.NaN, Infinity, -0.1, 1.1, '0.5', {}, true])(
    'falls back to default for %s',
    (v) => {
      expect(DEFAULT_HARD_MISTAKE_RATE).toBe(0.2)
      expect(resolveMistakeRate(v)).toBe(0.2)
    },
  )
})

describe('randomMove / findWinningMove', () => {
  it('picks by rng and clamps rng=1', () => {
    const b = applyMove(newBoard(), 0, 'X')
    expect(randomMove(b, () => 0)).toBe(1)
    expect(randomMove(b, () => 1)).toBe(8)
  })
  it('throws on full board', () => {
    const full: Board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']
    expect(() => randomMove(full, () => 0)).toThrow('No legal moves')
    expect(() => minimaxMove(full)).toThrow('No legal moves')
    expect(() => chooseMove(full, 'easy')).toThrow()
    expect(() => chooseMove(full, 'hard', { rng: () => 0.99 })).toThrow()
    expect(() => chooseMove(full, 'hard', { rng: () => 0, hardMistakeRate: 1 })).toThrow()
  })
  it('findWinningMove returns null when none', () => {
    expect(findWinningMove(newBoard(), 'O')).toBeNull()
  })
})

describe('easy bot', () => {
  it('always picks a legal move', () => {
    for (let n = 0; n < 200; n++) {
      let b = newBoard()
      let mark: 'X' | 'O' = 'X'
      while (!isOver(b)) {
        const m = chooseMove(b, 'easy')
        expect(legalMoves(b)).toContain(m)
        b = applyMove(b, m, mark)
        mark = mark === 'X' ? 'O' : 'X'
      }
    }
  })

  it('takes immediate win when rng < EASY_SMART_RATE', () => {
    // O O . / X X . / . . .  -> O wins at 2 (X could win at 5)
    const b: Board = ['O', 'O', null, 'X', 'X', null, null, null, null]
    expect(chooseMove(b, 'easy', { rng: () => LOW })).toBe(2)
  })

  it('blocks when no win and rng < EASY_SMART_RATE', () => {
    const b: Board = ['X', 'X', null, null, 'O', null, null, null, null]
    expect(chooseMove(b, 'easy', { rng: () => LOW })).toBe(2)
  })

  it('smart rate but nothing to win/block falls through to random', () => {
    const b = applyMove(newBoard(), 4, 'X')
    // first rng call LOW (smart), second 0 -> first legal move (0)
    expect(chooseMove(b, 'easy', { rng: seq(LOW, 0) })).toBe(0)
  })

  it('plays random when rng >= EASY_SMART_RATE (ignores win)', () => {
    const b: Board = ['O', 'O', null, 'X', 'X', null, null, null, null]
    // legal: 2,5,6,7,8 ; second rng 0 -> 2? use 0.99 -> last (8)
    expect(chooseMove(b, 'easy', { rng: seq(HIGH, 0.99) })).toBe(8)
    expect(chooseMove(b, 'easy', { rng: seq(EASY_SMART_RATE, 0.2) })).toBe(5)
  })
})

describe('hard bot', () => {
  it('rate 1 plays the random move given by rng', () => {
    const b = applyMove(newBoard(), 0, 'X')
    expect(chooseMove(b, 'hard', { rng: seq(0.5, 0), hardMistakeRate: 1 })).toBe(1)
    expect(chooseMove(b, 'hard', { rng: seq(0.5, 0.99), hardMistakeRate: 1 })).toBe(8)
  })

  it('rate 0 plays minimax regardless of rng', () => {
    const b: Board = ['X', 'X', null, null, 'O', null, null, null, null]
    expect(chooseMove(b, 'hard', { rng: () => 0, hardMistakeRate: 0 })).toBe(2)
  })

  it('invalid rate falls back to default 0.2', () => {
    const b: Board = ['X', 'X', null, null, 'O', null, null, null, null]
    // rng 0.1 < 0.2 -> random (first legal after rng 0 => 2 is first legal) use 0.99 for second => 8
    expect(chooseMove(b, 'hard', { rng: seq(0.1, 0.99), hardMistakeRate: 'bad' })).toBe(8)
    // rng 0.5 >= 0.2 -> minimax block
    expect(chooseMove(b, 'hard', { rng: () => 0.5, hardMistakeRate: Number.NaN })).toBe(2)
  })

  it('wins immediately when possible and prefers it over blocking', () => {
    const b: Board = ['O', 'O', null, 'X', 'X', null, null, null, null]
    expect(minimaxMove(b)).toBe(2)
  })

  it('with rate 0 the player (X, moving first) can never win - all reachable positions', () => {
    let positions = 0
    const explore = (board: Board): void => {
      // player to move: try every legal move
      for (const m of legalMoves(board)) {
        const afterX = applyMove(board, m, 'X')
        positions++
        expect(winner(afterX)).not.toBe('X')
        if (isOver(afterX)) continue
        const reply = chooseMove(afterX, 'hard', { rng: () => 0.5, hardMistakeRate: 0 })
        expect(legalMoves(afterX)).toContain(reply)
        const afterO = applyMove(afterX, reply, 'O')
        expect(winner(afterO)).not.toBe('X')
        if (isOver(afterO)) continue
        explore(afterO)
      }
    }
    explore(newBoard())
    expect(positions).toBeGreaterThan(100)
  })
})
