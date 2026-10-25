import { useRef, useState, type KeyboardEvent } from 'react'
import '@/web-app-ox/components/Board.css'
import type { Board as BoardState } from '../../shared/types'

export interface BoardProps {
  board: BoardState
  /** Called when the player activates an empty cell while the board is unlocked. */
  onPlay: (cell: number) => void
  /** Locks the board (bot thinking, request pending, game over). */
  locked: boolean
  /** Cells of the winning line, highlighted with a strike line. */
  winLine?: readonly number[] | null
  winTone?: 'win' | 'loss'
}

function cellLabel(index: number, value: BoardState[number]): string {
  const row = Math.floor(index / 3) + 1
  const col = (index % 3) + 1
  return `Row ${row}, column ${col}, ${value ?? 'empty'}`
}

function center(index: number): { x: number; y: number } {
  return { x: ((index % 3) + 0.5) * (100 / 3), y: (Math.floor(index / 3) + 0.5) * (100 / 3) }
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

export default function Board({ board, onPlay, locked, winLine = null, winTone = 'win' }: BoardProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const [focusIndex, setFocusIndex] = useState(() => {
    const firstEmpty = board.findIndex((c) => c === null)
    return firstEmpty === -1 ? 0 : firstEmpty
  })

  const move = (from: number, dr: number, dc: number) => {
    const row = Math.min(2, Math.max(0, Math.floor(from / 3) + dr))
    const col = Math.min(2, Math.max(0, (from % 3) + dc))
    const next = row * 3 + col
    setFocusIndex(next)
    refs.current[next]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const arrow = ARROWS[event.key]
    if (arrow) {
      event.preventDefault()
      move(index, arrow[0], arrow[1])
    }
  }

  const activate = (index: number) => {
    if (locked || board[index] !== null) return
    onPlay(index)
  }

  const start = winLine ? center(winLine[0]) : null
  const end = winLine ? center(winLine[2]) : null

  return (
    <div className="board" role="group" aria-label="Game board" aria-busy={locked}>
      {board.map((value, index) => {
        const inWin = winLine?.includes(index) ?? false
        const unavailable = locked || value !== null
        const classes = ['board__cell']
        if (value) classes.push(`board__cell--${value.toLowerCase()}`)
        if (inWin) classes.push(`board__cell--${winTone}`)
        return (
          <button
            key={index}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            className={classes.join(' ')}
            aria-label={cellLabel(index, value)}
            aria-disabled={unavailable}
            tabIndex={index === focusIndex ? 0 : -1}
            onFocus={() => setFocusIndex(index)}
            onKeyDown={(e) => onKeyDown(e, index)}
            onClick={() => activate(index)}
          >
            {value === 'X' && (
              <svg className="board__mark board__mark--x" viewBox="0 0 40 40" aria-hidden="true">
                <path d="M9 9 L31 31 M31 9 L9 31" />
              </svg>
            )}
            {value === 'O' && (
              <svg className="board__mark board__mark--o" viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="11" />
              </svg>
            )}
          </button>
        )
      })}
      {start && end && (
        <svg
          className={`board__strike board__strike--${winTone}`}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
        </svg>
      )}
    </div>
  )
}
