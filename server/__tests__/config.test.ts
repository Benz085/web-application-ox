import { describe, expect, it } from 'vitest'
import { DEFAULT_HARD_MISTAKE_RATE } from '../../shared/bot.js'
import { getHardMistakeRate } from '../config.js'
import { createFakeDb } from './helpers/fakeDb.js'

describe('getHardMistakeRate', () => {
  it('reads config/bot.hardMistakeRate', async () => {
    const db = createFakeDb()
    db.seed('config', 'bot', { hardMistakeRate: 0.4 })
    expect(await getHardMistakeRate(db)).toBe(0.4)
  })
  it('falls back to the default when missing, invalid or unreadable', async () => {
    const db = createFakeDb()
    expect(await getHardMistakeRate(db)).toBe(DEFAULT_HARD_MISTAKE_RATE)
    db.seed('config', 'bot', { hardMistakeRate: 7 })
    expect(await getHardMistakeRate(db)).toBe(DEFAULT_HARD_MISTAKE_RATE)
    db.failReads(new Error('unavailable'))
    expect(await getHardMistakeRate(db)).toBe(DEFAULT_HARD_MISTAKE_RATE)
  })
})
