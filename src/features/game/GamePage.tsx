import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet, apiPost } from '../../api/client'
import type { Profile } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import Board from '../../components/Board'
import { findWinLine } from '../../components/Board.utils'
import type { Difficulty, Game } from '../../../shared/types'
import GameOver from './GameOver'
import SetupPanel from './SetupPanel'
import StatsPanel from './StatsPanel'
import './game.css'

const STORAGE_KEY = 'ox:lastDifficulty'
const ERROR_TEXT = "Couldn't reach the server. Try again."

type Pending = 'loading' | 'start' | 'move' | 'abandon' | null

function readDifficulty(): Difficulty {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'hard' ? 'hard' : 'easy'
  } catch {
    return 'easy'
  }
}

function saveDifficulty(value: Difficulty): void {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // storage unavailable: the preference is just not remembered
  }
}

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function GamePage() {
  const { profile: authProfile } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [unfinished, setUnfinished] = useState<Game | null>(null)
  const [view, setView] = useState<'setup' | 'play'>('setup')
  const [difficulty, setDifficulty] = useState<Difficulty>(readDifficulty)
  const [pending, setPending] = useState<Pending>('loading')
  const [optimistic, setOptimistic] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)

  const shownProfile = profile ?? authProfile

  const applyCurrent = useCallback((res: { game: Game | null }) => {
    setUnfinished(res.game && res.game.status === 'in_progress' ? res.game : null)
    setPending(null)
  }, [])

  const loadCurrent = useCallback(async () => {
    try {
      applyCurrent(await apiGet<{ game: Game | null }>('/api/game/current'))
    } catch {
      setError(ERROR_TEXT)
      setPending(null)
    }
  }, [applyCurrent])

  useEffect(() => {
    const controller = new AbortController()
    apiGet<{ game: Game | null }>('/api/game/current', controller.signal).then(
      (res) => {
        if (!controller.signal.aborted) applyCurrent(res)
      },
      () => {
        if (controller.signal.aborted) return
        setError(ERROR_TEXT)
        setPending(null)
      },
    )
    return () => controller.abort()
  }, [applyCurrent])

  const finished = game !== null && game.status !== 'in_progress'

  useEffect(() => {
    if (finished) titleRef.current?.focus()
  }, [finished])

  const startGame = async (level: Difficulty) => {
    setPending('start')
    setError(null)
    saveDifficulty(level)
    try {
      const res = await apiPost<{ game: Game }>('/api/game/start', { difficulty: level })
      setGame(res.game)
      setUnfinished(null)
      setView('play')
      setPending(null)
    } catch (cause) {
      if (cause instanceof Error && 'status' in cause && cause.status === 409) {
        await loadCurrent()
        return
      }
      setError(ERROR_TEXT)
      setPending(null)
    }
  }

  const confirmNewGame = async () => {
    if (!unfinished) return
    setPending('abandon')
    setError(null)
    try {
      await apiPost<{ game: Game }>('/api/game/abandon', { gameId: unfinished.id })
      setConfirming(false)
      setUnfinished(null)
      // The abandoned game counted as a loss; pull the new score in the background.
      void apiGet<{ profile: Profile | null }>('/api/me').then(
        (me) => me.profile && setProfile(me.profile),
        () => undefined,
      )
      await startGame(difficulty)
    } catch {
      setError(ERROR_TEXT)
      setPending(null)
    }
  }

  const playCell = async (cell: number) => {
    if (!game || pending !== null || game.status !== 'in_progress') return
    setPending('move')
    setOptimistic(cell)
    setError(null)
    try {
      const res = await apiPost<{ game: Game; profile: Profile }>('/api/game/move', {
        gameId: game.id,
        cell,
      })
      setGame(res.game)
      setProfile(res.profile)
    } catch {
      setError(ERROR_TEXT)
    } finally {
      setOptimistic(null)
      setPending(null)
    }
  }

  const resume = () => {
    if (!unfinished) return
    setGame(unfinished)
    setDifficulty(unfinished.difficulty)
    setView('play')
  }

  const changeDifficulty = () => {
    if (game) setDifficulty(game.difficulty)
    setGame(null)
    setView('setup')
    setError(null)
  }

  const errorBox = error && (
    <div className="alert game__alert" role="alert">
      <p className="alert__text">{error}</p>
    </div>
  )

  if (pending === 'loading') {
    return (
      <div className="state" role="status">
        <span className="spinner" aria-hidden="true" />
        <p className="state__text">Loading…</p>
      </div>
    )
  }

  if (view === 'play' && game) {
    const winLine = game.status === 'won' || game.status === 'lost' ? findWinLine(game.board) : null
    const board = optimistic === null ? game.board : game.board.map((c, i) => (i === optimistic ? 'X' : c))
    const thinking = pending === 'move'
    let status = 'Your turn'
    if (thinking) status = 'Bot is thinking…'
    else if (finished) status = 'Game over'

    return (
      <div className="game">
        <div className="game__main">
          <p className="game__status" aria-live="polite">
            <strong>{status}</strong>
            {thinking && <span className="spinner game__spinner" aria-hidden="true" />}
          </p>
          <p className="game__meta">
            You are <strong>X</strong> · Bot is <strong>O</strong> · Difficulty: {cap(game.difficulty)}
            {thinking && ' · The board is locked until the bot moves.'}
          </p>
          {errorBox}
          <Board
            board={board}
            onPlay={(cell) => void playCell(cell)}
            locked={pending !== null || finished}
            winLine={winLine}
            winTone={game.status === 'lost' ? 'loss' : 'win'}
          />
          {finished && (
            <GameOver
              ref={titleRef}
              game={game}
              winLine={winLine}
              streak={shownProfile?.streak ?? null}
              disabled={pending !== null}
              onPlayAgain={() => void startGame(game.difficulty)}
              onChangeDifficulty={changeDifficulty}
            />
          )}
        </div>
        <StatsPanel profile={shownProfile} />
      </div>
    )
  }

  const starting = pending === 'start' || pending === 'abandon'

  return (
    <div className="game">
      <div className="game__main">
        {errorBox}
        {unfinished && (
          <section className="card resume" aria-labelledby="resume-title">
            <h2 id="resume-title" className="resume__title">
              You have an unfinished game
            </h2>
            <p className="resume__text">
              Difficulty: {cap(unfinished.difficulty)} · {unfinished.board.filter((c) => c === 'X' || c === 'O').length}{' '}
              moves played · It&apos;s your turn.
            </p>
            <button type="button" className="btn btn--primary" disabled={starting} onClick={resume}>
              Resume game
            </button>
          </section>
        )}
        {confirming && unfinished && (
          <div className="card confirm" role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-text">
            <h2 id="confirm-title" className="confirm__title">
              Start a new game?
            </h2>
            <p id="confirm-text" className="confirm__text">
              Your unfinished game will count as a loss (−1 point, streak back to 0).
            </p>
            <div className="confirm__actions">
              <button type="button" className="btn btn--primary" disabled={starting} onClick={() => void confirmNewGame()}>
                {starting ? 'Starting…' : 'Yes, start new game'}
              </button>
              <button type="button" className="btn btn--secondary" disabled={starting} onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {!confirming && (
          <SetupPanel
            difficulty={difficulty}
            onChange={setDifficulty}
            starting={starting}
            startLabel={unfinished ? 'Start new game' : 'Start game'}
            onStart={() => (unfinished ? setConfirming(true) : void startGame(difficulty))}
          />
        )}
      </div>
      <StatsPanel profile={shownProfile} />
    </div>
  )
}
