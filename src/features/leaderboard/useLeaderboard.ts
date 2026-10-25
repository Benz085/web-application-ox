import { useCallback, useEffect, useState } from 'react'
import { apiGet } from 'web-app-ox/api/client'
import type { LeaderboardEntry } from '../../../shared/types'

export type LeaderboardState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; players: LeaderboardEntry[] }

export function useLeaderboard(): { state: LeaderboardState; retry: () => void } {
  const [state, setState] = useState<LeaderboardState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    apiGet<{ players: LeaderboardEntry[] }>('/api/leaderboard', controller.signal).then(
      (data) => setState({ status: 'ready', players: data.players }),
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      },
    )
    return () => controller.abort()
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry }
}
