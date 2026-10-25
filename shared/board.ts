import type { Board, Cell, Mark } from './types.js'

export const BOARD_SIZE = 9

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

export function newBoard(): Board {
  return Array<Cell>(BOARD_SIZE).fill(null)
}

export function isLegalMove(board: Board, cell: unknown): cell is number {
  return (
    Number.isInteger(cell) &&
    (cell as number) >= 0 &&
    (cell as number) < BOARD_SIZE &&
    board[cell as number] === null
  )
}

export function legalMoves(board: Board): number[] {
  const moves: number[] = []
  board.forEach((c, i) => {
    if (c === null) moves.push(i)
  })
  return moves
}

/** Returns a new board; throws if the move is illegal. */
export function applyMove(board: Board, cell: number, mark: Mark): Board {
  if (!isLegalMove(board, cell)) throw new Error('Illegal move')
  const next = board.slice()
  next[cell] = mark
  return next
}

export function winner(board: Board): Mark | null {
  for (const [a, b, c] of WIN_LINES) {
    const m = board[a]
    if (m !== null && m === board[b] && m === board[c]) return m
  }
  return null
}

export function isDraw(board: Board): boolean {
  return winner(board) === null && board.every((c) => c !== null)
}

export function isOver(board: Board): boolean {
  return winner(board) !== null || isDraw(board)
}
