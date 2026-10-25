import { describe, expect, it } from 'vitest'
import { pickInProgress, toGame, toRecord } from '../gameRepo.js'

describe('gameRepo', () => {
  it('toRecord sanitises malformed data', () => {
    const r = toRecord('g1', { uid: 5, difficulty: 'weird', board: [1], status: 'nope', scoreDelta: 'x', bonus: 'y' })
    expect(r).toEqual({ id: 'g1', uid: '', difficulty: 'easy', board: Array(9).fill(null), status: 'in_progress', scoreDelta: undefined, bonus: undefined })
  })
  it('toRecord keeps valid data', () => {
    const board = Array(9).fill(null)
    expect(toRecord('g', { uid: 'u', difficulty: 'hard', board, status: 'won', scoreDelta: 1, bonus: true })).toMatchObject({ difficulty: 'hard', status: 'won', scoreDelta: 1, bonus: true })
  })
  it('toGame includes result only for finished games with scoreDelta', () => {
    const base = { id: 'g', uid: 'u', difficulty: 'easy' as const, board: Array(9).fill(null) }
    expect(toGame({ ...base, status: 'in_progress', scoreDelta: 1 })).not.toHaveProperty('result')
    expect(toGame({ ...base, status: 'won' })).not.toHaveProperty('result')
    expect(toGame({ ...base, status: 'won', scoreDelta: 2, bonus: true }).result).toEqual({ scoreDelta: 2, bonus: true })
    expect(toGame({ ...base, status: 'lost', scoreDelta: -1 }).result).toEqual({ scoreDelta: -1, bonus: false })
  })
  it('pickInProgress finds only the user\'s open game', () => {
    const docs = [
      { id: 'a', data: { uid: 'u', status: 'won' } },
      { id: 'b', data: { uid: 'other', status: 'in_progress' } },
      { id: 'c', data: { uid: 'u', status: 'in_progress' } },
    ]
    expect(pickInProgress(docs, 'u')?.id).toBe('c')
    expect(pickInProgress(docs.slice(0, 2), 'u')).toBeNull()
  })
})
