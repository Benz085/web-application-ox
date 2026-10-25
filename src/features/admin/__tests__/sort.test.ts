import '@/web-app-ox/test/setup'
import { describe, expect, it } from 'vitest'
import { makeAdminPlayer } from '@/web-app-ox/test/fixtures'
import {
  DEFAULT_SORT,
  SORT_KEYS,
  SORT_LABELS,
  formatLastPlayed,
  formatScore,
  sortPlayers,
} from '@/web-app-ox/features/admin/sort'

const a = makeAdminPlayer({ uid: 'a', email: 'a@x.test', score: 1, streak: 0, wins: 5, losses: 3, draws: 2 })
const b = makeAdminPlayer({ uid: 'b', email: 'b@x.test', score: 5, streak: 2, wins: 1, losses: 9, draws: 0 })
const c = makeAdminPlayer({ uid: 'c', email: 'c@x.test', score: -2, streak: 1, wins: 3, losses: 1, draws: 7 })

const emails = (list: ReturnType<typeof sortPlayers>) => list.map((p) => p.email[0])

describe('sortPlayers', () => {
  it('defaults to score descending', () => {
    expect(DEFAULT_SORT).toEqual({ key: 'score', dir: 'desc' })
    expect(emails(sortPlayers([a, b, c], DEFAULT_SORT))).toEqual(['b', 'a', 'c'])
  })

  it.each([
    ['score', 'asc', ['c', 'a', 'b']],
    ['score', 'desc', ['b', 'a', 'c']],
    ['streak', 'asc', ['a', 'c', 'b']],
    ['streak', 'desc', ['b', 'c', 'a']],
    ['wins', 'asc', ['b', 'c', 'a']],
    ['wins', 'desc', ['a', 'c', 'b']],
    ['losses', 'asc', ['c', 'a', 'b']],
    ['losses', 'desc', ['b', 'a', 'c']],
    ['draws', 'asc', ['b', 'a', 'c']],
    ['draws', 'desc', ['c', 'a', 'b']],
    ['email', 'asc', ['a', 'b', 'c']],
    ['email', 'desc', ['c', 'b', 'a']],
  ] as const)('sorts by %s %s', (key, dir, expected) => {
    expect(emails(sortPlayers([b, c, a], { key, dir }))).toEqual(expected)
  })

  it('breaks ties by email ascending in both directions', () => {
    const t1 = makeAdminPlayer({ uid: 't1', email: 'z@x.test', score: 3 })
    const t2 = makeAdminPlayer({ uid: 't2', email: 'm@x.test', score: 3 })
    expect(emails(sortPlayers([t1, t2], { key: 'score', dir: 'desc' }))).toEqual(['m', 'z'])
    expect(emails(sortPlayers([t1, t2], { key: 'score', dir: 'asc' }))).toEqual(['m', 'z'])
  })

  it('does not mutate the input', () => {
    const input = [b, c, a]
    sortPlayers(input, { key: 'email', dir: 'asc' })
    expect(input).toEqual([b, c, a])
  })

  it('returns an empty list for no players', () => {
    expect(sortPlayers([], DEFAULT_SORT)).toEqual([])
  })
})

describe('sortPlayers by lastPlayedAt', () => {
  const early = makeAdminPlayer({ uid: 'e', email: 'e@x.test', lastPlayedAt: '2025-01-01T10:00:00.000Z' })
  const late = makeAdminPlayer({ uid: 'l', email: 'l@x.test', lastPlayedAt: '2025-06-01T10:00:00.000Z' })
  const never1 = makeAdminPlayer({ uid: 'n1', email: 'n1@x.test', lastPlayedAt: null })
  const never2 = makeAdminPlayer({ uid: 'n2', email: 'n2@x.test', lastPlayedAt: null })
  const garbage = makeAdminPlayer({ uid: 'g', email: 'g@x.test', lastPlayedAt: 'not a date' })

  it('sorts by time ascending and descending', () => {
    expect(emails(sortPlayers([late, early], { key: 'lastPlayedAt', dir: 'asc' }))).toEqual(['e', 'l'])
    expect(emails(sortPlayers([early, late], { key: 'lastPlayedAt', dir: 'desc' }))).toEqual(['l', 'e'])
  })

  it.each(['asc', 'desc'] as const)('always puts never-played players last (%s)', (dir) => {
    const sorted = sortPlayers([never1, late, early, never2], { key: 'lastPlayedAt', dir })
    expect(sorted.slice(2).map((p) => p.uid)).toEqual(['n1', 'n2'])
    expect(sorted.slice(0, 2).map((p) => p.uid).sort()).toEqual(['e', 'l'])
  })

  it('handles the null comparison from both sides', () => {
    expect(emails(sortPlayers([late, never1], { key: 'lastPlayedAt', dir: 'asc' }))).toEqual(['l', 'n'])
    expect(emails(sortPlayers([never1, late], { key: 'lastPlayedAt', dir: 'asc' }))).toEqual(['l', 'n'])
  })

  it('treats an unparsable date as never played', () => {
    expect(emails(sortPlayers([garbage, early], { key: 'lastPlayedAt', dir: 'desc' }))).toEqual(['e', 'g'])
  })

  it('orders two never-played players by email', () => {
    expect(emails(sortPlayers([never2, never1], { key: 'lastPlayedAt', dir: 'desc' }))).toEqual(['n', 'n'])
    expect(sortPlayers([never2, never1], { key: 'lastPlayedAt', dir: 'desc' }).map((p) => p.uid)).toEqual(['n1', 'n2'])
  })

  it('breaks identical timestamps by email', () => {
    const x = makeAdminPlayer({ uid: 'x', email: 'x@x.test', lastPlayedAt: early.lastPlayedAt })
    expect(sortPlayers([x, early], { key: 'lastPlayedAt', dir: 'asc' }).map((p) => p.uid)).toEqual(['e', 'x'])
  })
})

describe('formatLastPlayed', () => {
  it('formats in the viewer local time as YYYY-MM-DD HH:mm with zero padding', () => {
    expect(formatLastPlayed(new Date(2025, 0, 5, 4, 7).toISOString())).toBe('2025-01-05 04:07')
    expect(formatLastPlayed(new Date(2025, 11, 31, 23, 59).toISOString())).toBe('2025-12-31 23:59')
  })

  it.each([null, '', 'garbage'])('returns an em dash for %j', (value) => {
    expect(formatLastPlayed(value)).toBe('—')
  })
})

describe('formatScore / labels', () => {
  it.each([
    [3, '3'],
    [0, '0'],
    [-4, '−4'],
  ])('formats %d as %s', (score, text) => {
    expect(formatScore(score)).toBe(text)
  })

  it('has a label for every sort key, in column order', () => {
    expect(SORT_KEYS).toEqual(['email', 'score', 'streak', 'wins', 'losses', 'draws', 'lastPlayedAt'])
    expect(SORT_LABELS.lastPlayedAt).toBe('Last played')
  })
})
