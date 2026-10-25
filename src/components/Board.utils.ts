import type { Board } from '../../shared/types'

export const WIN_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export function findWinLine(board: Board): readonly [number, number, number] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line
    const mark = board[a]
    if (mark && mark === board[b] && mark === board[c]) return line
  }
  return null
}
