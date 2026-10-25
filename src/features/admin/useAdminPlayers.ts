import { useCallback, useEffect, useState } from 'react'
import { apiGet } from 'web-app-ox/api/client'
import type { AdminPlayer } from '../../../shared/types'

export type AdminState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; players: AdminPlayer[] }

export function useAdminPlayers(): { state: AdminState; retry: () => void } {
  const [state, setState] = useState<AdminState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    apiGet<{ players: AdminPlayer[] }>('/api/admin/players', controller.signal).then(
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
