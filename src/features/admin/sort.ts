import type { AdminPlayer } from '../../../shared/types'

export type SortKey = 'email' | 'score' | 'streak' | 'wins' | 'losses' | 'draws' | 'lastPlayedAt'
export type SortDir = 'asc' | 'desc'

export interface SortState {
  key: SortKey
  dir: SortDir
}

export const DEFAULT_SORT: SortState = { key: 'score', dir: 'desc' }

function time(value: string | null): number | null {
  if (!value) return null
  const t = Date.parse(value)
  return Number.isNaN(t) ? null : t
}

export function sortPlayers(players: AdminPlayer[], sort: SortState): AdminPlayer[] {
  const sign = sort.dir === 'asc' ? 1 : -1
  return [...players].sort((a, b) => {
    let result = 0
    if (sort.key === 'email') {
      result = a.email.localeCompare(b.email) * sign
    } else if (sort.key === 'lastPlayedAt') {
      const ta = time(a.lastPlayedAt)
      const tb = time(b.lastPlayedAt)
      // Players who never finished a game always go last.
      if (ta === null && tb === null) result = 0
      else if (ta === null) return 1
      else if (tb === null) return -1
      else result = (ta - tb) * sign
    } else {
      result = (a[sort.key] - b[sort.key]) * sign
    }
    return result !== 0 ? result : a.email.localeCompare(b.email)
  })
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "YYYY-MM-DD HH:mm" in the viewer's local time zone, or "—" when never played. */
export function formatLastPlayed(value: string | null): string {
  const t = time(value)
  if (t === null) return '—'
  const d = new Date(t)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatScore(score: number): string {
  return score < 0 ? `−${Math.abs(score)}` : String(score)
}

export const SORT_LABELS: Record<SortKey, string> = {
  email: 'Email',
  score: 'Score',
  streak: 'Streak',
  wins: 'Wins',
  losses: 'Losses',
  draws: 'Draws',
  lastPlayedAt: 'Last played',
}

export const SORT_KEYS = Object.keys(SORT_LABELS) as SortKey[]
