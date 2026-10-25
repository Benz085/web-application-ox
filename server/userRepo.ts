import type { AdminPlayer, LeaderboardEntry, Profile } from '../shared/types.js'
import type { Stats } from '../shared/scoring.js'
import { USERS } from './db.js'
import type { Data, Db, DbReader } from './db.js'

export interface ProfileInput {
  displayName: string
  email: string | null
  photoURL: string | null
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' && v !== '' ? v : fallback
}

export function statsOf(data: Data): Stats {
  return {
    score: num(data.score),
    streak: num(data.streak),
    wins: num(data.wins),
    losses: num(data.losses),
    draws: num(data.draws),
  }
}

export function toProfile(data: Data): Profile {
  return {
    displayName: str(data.displayName, 'Player'),
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
    ...statsOf(data),
  }
}

/** Reads `users/{uid}` and creates it on first call only. Never resets an existing profile. */
export async function getOrCreateProfile(db: Db, uid: string, input: ProfileInput, now: Date = new Date()): Promise<Profile> {
  const existing = await db.get(USERS, uid)
  if (existing) return toProfile(existing)
  const fresh: Data = {
    displayName: input.displayName,
    email: input.email,
    photoURL: input.photoURL,
    score: 0,
    streak: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    createdAt: now,
    lastPlayedAt: null,
  }
  const created = await db.createIfAbsent(USERS, uid, fresh)
  if (created) return toProfile(fresh)
  // Lost a creation race: read what the winner wrote.
  const winner = await db.get(USERS, uid)
  return toProfile(winner ?? fresh)
}

export async function getProfile(db: DbReader, uid: string): Promise<Profile | null> {
  const data = await db.get(USERS, uid)
  return data ? toProfile(data) : null
}

export async function listLeaderboard(db: Db): Promise<LeaderboardEntry[]> {
  const docs = await db.list(USERS, { orderBy: { field: 'score', direction: 'desc' }, limit: 100 })
  const rows = docs
    .map((d) => toProfile(d.data))
    .filter((p) => p.wins + p.losses + p.draws > 0)
    .sort(
      (a, b) => b.score - a.score || b.wins - a.wins || a.displayName.localeCompare(b.displayName),
    )
  return rows.map((p, i) => ({
    rank: i + 1,
    displayName: p.displayName,
    photoURL: p.photoURL,
    score: p.score,
    wins: p.wins,
    losses: p.losses,
    draws: p.draws,
  }))
}

function iso(v: unknown): string | null {
  return v instanceof Date && !Number.isNaN(v.getTime()) ? v.toISOString() : null
}

export async function listAllPlayers(db: Db): Promise<AdminPlayer[]> {
  const docs = await db.list(USERS)
  return docs
    .map((d) => ({
      uid: d.id,
      displayName: str(d.data.displayName, 'Player'),
      email: typeof d.data.email === 'string' ? d.data.email : '',
      ...statsOf(d.data),
      lastPlayedAt: iso(d.data.lastPlayedAt),
    }))
    .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName))
}
