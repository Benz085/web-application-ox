import type { Board } from '../../shared/types'

import { WIN_LINES } from '../../shared/board'

export { WIN_LINES }

export function findWinLine(board: Board): readonly [number, number, number] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line
    const mark = board[a]
    if (mark && mark === board[b] && mark === board[c]) return line
  }
  return null
}
