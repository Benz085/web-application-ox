import { forwardRef } from 'react'
import type { Game, Mark } from '../../../shared/types'

const LINE_NAMES: Record<string, string> = {
  '0,1,2': 'in the top row',
  '3,4,5': 'in the middle row',
  '6,7,8': 'in the bottom row',
  '0,3,6': 'in the left column',
  '1,4,7': 'in the middle column',
  '2,5,8': 'in the right column',
  '0,4,8': 'in a diagonal',
  '2,4,6': 'in a diagonal',
}

function signed(n: number): string {
  if (n > 0) return `+${n}`
  if (n < 0) return `−${Math.abs(n)}`
  return '0'
}

interface Props {
  game: Game
  winLine: readonly number[] | null
  streak: number | null
  onPlayAgain: () => void
  onChangeDifficulty: () => void
  disabled: boolean
}

const GameOver = forwardRef<HTMLHeadingElement, Props>(function GameOver(
  { game, winLine, streak, onPlayAgain, onChangeDifficulty, disabled },
  ref,
) {
  const delta = game.result?.scoreDelta ?? (game.status === 'won' ? 1 : game.status === 'lost' ? -1 : 0)
  const bonus = game.result?.bonus ?? false
  const mark: Mark = game.status === 'won' ? 'X' : 'O'
  const where = winLine ? (LINE_NAMES[winLine.join(',')] ?? '') : ''

  let title: string
  let detail: string
  let points: string
  let streakText: string
  if (game.status === 'won') {
    title = bonus ? '3 wins in a row!' : 'You win!'
    detail = `You got three ${mark} ${where}.`
    points = bonus ? '+1 for the win, +1 streak bonus.' : '+1 point for the win.'
    streakText = bonus ? 'Win streak starts again at 0/3.' : `Win streak is now ${streak ?? '?'}/3.`
  } else if (game.status === 'lost') {
    title = 'You lose'
    detail = winLine ? `The bot got three ${mark} ${where}.` : 'The game ended as a loss.'
    points = '−1 point for the loss.'
    streakText = 'Win streak resets to 0/3.'
  } else {
    title = "It's a draw"
    detail = 'The board is full and nobody got three in a row.'
    points = 'No points this game.'
    streakText = 'Win streak resets to 0/3.'
  }

  return (
    <section className={`card gameover gameover--${game.status}`} aria-labelledby="gameover-title">
      <p className="gameover__eyebrow">Game over</p>
      <h2 id="gameover-title" className="gameover__title" tabIndex={-1} ref={ref}>
        {title}
      </h2>
      <p className="gameover__detail">{detail}</p>
      <p className="gameover__delta" aria-label={`Score change ${signed(delta)}`}>
        {signed(delta)}
      </p>
      <p className="gameover__points">{points}</p>
      <p className="gameover__streak">{streakText}</p>
      <div className="gameover__actions">
        <button type="button" className="btn btn--primary" disabled={disabled} onClick={onPlayAgain}>
          Play again
        </button>
        <button type="button" className="btn btn--secondary" disabled={disabled} onClick={onChangeDifficulty}>
          Change difficulty
        </button>
      </div>
    </section>
  )
})

export default GameOver
