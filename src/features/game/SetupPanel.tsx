import type { KeyboardEvent } from 'react'
import type { Difficulty } from '../../../shared/types'

const OPTIONS: { value: Difficulty; label: string; text: string }[] = [
  { value: 'easy', label: 'Easy', text: 'The bot mostly moves at random.' },
  { value: 'hard', label: 'Hard', text: 'The bot plays smart but sometimes makes a mistake.' },
]

interface Props {
  difficulty: Difficulty
  onChange: (value: Difficulty) => void
  onStart: () => void
  starting: boolean
  startLabel?: string
}

export default function SetupPanel({ difficulty, onChange, onStart, starting, startLabel = 'Start game' }: Props) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (starting) return
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
      event.preventDefault()
      const next: Difficulty = difficulty === 'easy' ? 'hard' : 'easy'
      onChange(next)
      const group = event.currentTarget.parentElement
      group?.querySelector<HTMLButtonElement>(`[data-value="${next}"]`)?.focus()
    }
  }

  return (
    <section className="card setup" aria-labelledby="setup-title">
      <h2 id="setup-title" className="setup__title">
        New game
      </h2>
      <div role="radiogroup" aria-label="Choose difficulty" className="setup__options">
        {OPTIONS.map((o) => {
          const selected = o.value === difficulty
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              data-value={o.value}
              aria-checked={selected}
              disabled={starting}
              tabIndex={selected ? 0 : -1}
              className={selected ? 'setup__option setup__option--selected' : 'setup__option'}
              onClick={() => onChange(o.value)}
              onKeyDown={onKeyDown}
            >
              <span className="setup__option-name">{o.label}</span>
              <span className="setup__option-text">{o.text}</span>
              {selected && <span className="setup__pill">Selected</span>}
            </button>
          )
        })}
      </div>
      <button type="button" className="btn btn--primary setup__start" disabled={starting} onClick={onStart}>
        {starting ? 'Starting…' : startLabel}
      </button>
      <p className="setup__note">You play X and always move first. Scoring is the same on both levels.</p>
    </section>
  )
}
