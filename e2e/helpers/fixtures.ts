import { test as base, expect } from '@playwright/test'
import type { AdminPlayer, LeaderboardEntry } from '../../shared/types.ts'
import { MockApi } from './mockApi.ts'

export { expect }

/** `api` = fresh stateful mock of `/api/*`, already installed on the page. */
export const test = base.extend<{ api: MockApi }>({
  // auto: the mock is installed even in tests that never touch `api` (no real backend in E2E)
  api: [
    async ({ page }, provide) => {
      const api = new MockApi()
      await api.install(page)
      await provide(api)
    },
    { auto: true },
  ],
})

export function entry(rank: number, displayName: string, score: number, rest: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return { rank, isYou: false, displayName, photoURL: null, score, wins: 0, losses: 0, draws: 0, ...rest }
}

export function adminPlayer(uid: string, email: string, rest: Partial<AdminPlayer> = {}): AdminPlayer {
  return {
    uid,
    displayName: email.split('@')[0],
    email,
    score: 0,
    streak: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    lastPlayedAt: null,
    ...rest,
  }
}
