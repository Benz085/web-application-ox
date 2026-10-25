import { describe, expect, it } from 'vitest'
import { STREAK_BONUS_AT, apply, type Stats } from '../scoring.js'

const zero: Stats = { score: 0, streak: 0, wins: 0, losses: 0, draws: 0 }

describe('scoring.apply', () => {
  it('win: +1, streak+1, wins+1', () => {
    const r = apply(zero, 'win')
    expect(r.stats).toEqual({ score: 1, streak: 1, wins: 1, losses: 0, draws: 0 })
    expect(r.result).toEqual({ scoreDelta: 1, bonus: false })
  })

  it('loss: -1, streak 0, may go negative', () => {
    const r = apply({ ...zero, streak: 2 }, 'loss')
    expect(r.stats).toEqual({ score: -1, streak: 0, wins: 0, losses: 1, draws: 0 })
    expect(r.result).toEqual({ scoreDelta: -1, bonus: false })
    expect(apply(r.stats, 'loss').stats.score).toBe(-2)
  })

  it('draw: 0 score, streak 0, draws+1', () => {
    const r = apply({ ...zero, score: 5, streak: 2 }, 'draw')
    expect(r.stats).toEqual({ score: 5, streak: 0, wins: 0, losses: 0, draws: 1 })
    expect(r.result).toEqual({ scoreDelta: 0, bonus: false })
  })

  it('AC-15: streak 2 + win gives +2 with bonus, streak resets, next win starts at 1', () => {
    expect(STREAK_BONUS_AT).toBe(3)
    const r = apply({ ...zero, score: 2, streak: 2, wins: 2 }, 'win')
    expect(r.stats).toEqual({ score: 4, streak: 0, wins: 3, losses: 0, draws: 0 })
    expect(r.result).toEqual({ scoreDelta: 2, bonus: true })
    const n = apply(r.stats, 'win')
    expect(n.stats.streak).toBe(1)
    expect(n.stats.score).toBe(5)
    expect(n.result.bonus).toBe(false)
  })

  it('three wins in a row total +4', () => {
    let s = zero
    for (let i = 0; i < 3; i++) s = apply(s, 'win').stats
    expect(s).toEqual({ score: 4, streak: 0, wins: 3, losses: 0, draws: 0 })
  })

  it('counters accumulate and input is not mutated', () => {
    const input: Stats = { ...zero }
    let s = input
    for (const o of ['win', 'loss', 'draw', 'draw', 'loss', 'loss'] as const) s = apply(s, o).stats
    expect(s).toEqual({ score: -2, streak: 0, wins: 1, losses: 3, draws: 2 })
    expect(input).toEqual(zero)
  })
})
