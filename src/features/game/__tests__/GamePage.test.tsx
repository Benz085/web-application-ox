import '@/web-app-ox/test/setup'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiGet, apiPost } from '@/web-app-ox/api/client'
import type { Profile } from '@/web-app-ox/api/types'
import { deferred, makeGame, makeProfile } from '@/web-app-ox/test/fixtures'
import { renderAt } from '@/web-app-ox/test/render'
import type { Game } from '../../../../shared/types'
import GamePage from '@/web-app-ox/features/game/GamePage'

vi.mock('@/web-app-ox/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/web-app-ox/api/client')>()),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

const mockedGet = vi.mocked(apiGet)
const mockedPost = vi.mocked(apiPost)

const PROFILE = makeProfile({ score: 4, streak: 1, wins: 6, losses: 2, draws: 1 })
const STORAGE_KEY = 'ox:lastDifficulty'

/** GET /api/game/current resolves to `current`; GET /api/me resolves to the profile. */
function mockCurrent(current: Game | null, me: { profile: Profile | null } | Error = { profile: PROFILE }) {
  mockedGet.mockImplementation((path: string) => {
    if (path === '/api/game/current') return Promise.resolve({ game: current })
    if (path === '/api/me') return me instanceof Error ? Promise.reject(me) : Promise.resolve(me)
    return Promise.reject(new Error(`unexpected GET ${path}`))
  })
}

async function open(current: Game | null = null, profile: Profile | null = PROFILE) {
  mockCurrent(current)
  const view = renderAt(<GamePage />, { auth: { profile } })
  await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
  return view
}

const cell = (name: string) => screen.getByRole('button', { name })
const startButton = () => screen.getByRole('button', { name: 'Start game' })
const radio = (name: RegExp) => screen.getByRole('radio', { name })

async function startWith(game: Game) {
  mockedPost.mockResolvedValueOnce({ game })
  await userEvent.click(startButton())
  await screen.findByRole('group', { name: 'Game board' })
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GamePage loading and setup (AC-5, UI-2)', () => {
  it('shows Loading… first, then the setup with stats', async () => {
    const gate = deferred<{ game: Game | null }>()
    mockedGet.mockReturnValue(gate.promise)
    renderAt(<GamePage />, { auth: { profile: PROFILE } })
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    gate.resolve({ game: null })
    expect(await screen.findByRole('heading', { name: 'New game' })).toBeInTheDocument()
    expect(mockedGet).toHaveBeenCalledWith('/api/game/current', expect.any(AbortSignal))
    expect(screen.getByRole('heading', { name: 'Your stats' })).toBeInTheDocument()
    expect(screen.getByText('1/3')).toBeInTheDocument()
  })

  it('preselects Easy for a new player', async () => {
    await open()
    expect(radio(/Easy/)).toHaveAttribute('aria-checked', 'true')
    expect(radio(/Hard/)).toHaveAttribute('aria-checked', 'false')
  })

  it('preselects the last played level from storage', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'hard')
    await open()
    expect(radio(/Hard/)).toHaveAttribute('aria-checked', 'true')
  })

  it('falls back to Easy for an unknown stored value', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'medium')
    await open()
    expect(radio(/Easy/)).toHaveAttribute('aria-checked', 'true')
  })

  it('falls back to Easy when storage is unavailable, and still starts the game', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    await open()
    expect(radio(/Easy/)).toHaveAttribute('aria-checked', 'true')
    await startWith(makeGame())
    expect(screen.getByText('Your turn')).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('hides the stats panel when there is no profile', async () => {
    await open(null, null)
    expect(screen.queryByRole('heading', { name: 'Your stats' })).not.toBeInTheDocument()
  })

  it('shows an alert when the current game cannot be loaded and still offers setup', async () => {
    mockedGet.mockRejectedValue(new Error('down'))
    renderAt(<GamePage />, { auth: { profile: PROFILE } })
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reach the server. Try again.")
    expect(startButton()).toBeEnabled()
  })

  it('ignores the load result after unmount', async () => {
    const gate = deferred<{ game: Game | null }>()
    mockedGet.mockReturnValue(gate.promise)
    const view = renderAt(<GamePage />, { auth: { profile: PROFILE } })
    const signal = mockedGet.mock.calls[0][1] as AbortSignal
    view.unmount()
    expect(signal.aborted).toBe(true)
    gate.reject(new Error('late'))
    await Promise.resolve()
  })

  it('ignores a successful load that arrives after unmount', async () => {
    const gate = deferred<{ game: Game | null }>()
    mockedGet.mockReturnValue(gate.promise)
    const view = renderAt(<GamePage />, { auth: { profile: PROFILE } })
    view.unmount()
    gate.resolve({ game: null })
    await Promise.resolve()
  })

  it('ignores a finished game returned as current', async () => {
    await open(makeGame({ status: 'won' }))
    expect(screen.queryByText('You have an unfinished game')).not.toBeInTheDocument()
  })
})

describe('GamePage start', () => {
  it('starts the selected level, remembers it, and shows the board with X to move', async () => {
    await open()
    await userEvent.click(radio(/Hard/))
    await startWith(makeGame({ difficulty: 'hard' }))
    expect(mockedPost).toHaveBeenCalledWith('/api/game/start', { difficulty: 'hard' })
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('hard')
    expect(screen.getByText('Your turn')).toBeInTheDocument()
    expect(screen.getByText(/Difficulty: Hard/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /empty$/ })).toHaveLength(9)
    expect(screen.getByRole('heading', { name: 'Your stats' })).toBeInTheDocument()
  })

  it('disables the setup while starting', async () => {
    await open()
    const gate = deferred<{ game: Game }>()
    mockedPost.mockReturnValue(gate.promise)
    await userEvent.click(startButton())
    expect(screen.getByRole('button', { name: 'Starting…' })).toBeDisabled()
    expect(radio(/Easy/)).toBeDisabled()
    expect(radio(/Hard/)).toBeDisabled()
    gate.resolve({ game: makeGame() })
    await screen.findByRole('group', { name: 'Game board' })
  })

  it('shows an alert and stays on setup when start fails', async () => {
    await open()
    mockedPost.mockRejectedValue(new ApiError(500, 'X', 'boom'))
    await userEvent.click(startButton())
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reach the server. Try again.")
    expect(startButton()).toBeEnabled()
  })

  it('treats a plain Error (no status) as a failed start', async () => {
    await open()
    mockedPost.mockRejectedValue(new Error('x'))
    await userEvent.click(startButton())
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('on 409 (game already in progress) reloads the current game and shows the resume banner', async () => {
    await open()
    const running = makeGame({ id: 'g9', difficulty: 'hard', cells: 'XO.......' })
    mockedPost.mockRejectedValue(new ApiError(409, 'GAME_IN_PROGRESS', 'busy'))
    mockCurrent(running)
    await userEvent.click(startButton())
    expect(await screen.findByText('You have an unfinished game')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('on 409 shows an alert when the reload fails too', async () => {
    await open()
    mockedPost.mockRejectedValue(new ApiError(409, 'GAME_IN_PROGRESS', 'busy'))
    mockedGet.mockRejectedValue(new Error('down'))
    await userEvent.click(startButton())
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

describe('GamePage resume banner (AC-9, UI-5)', () => {
  const running = makeGame({ id: 'g7', difficulty: 'hard', cells: 'XO..X....' })

  it('shows the banner with difficulty and move count, and a "Start new game" label', async () => {
    await open(running)
    const banner = screen.getByRole('region', { name: 'You have an unfinished game' })
    expect(banner).toHaveTextContent('Difficulty: Hard')
    expect(banner).toHaveTextContent('3 moves played')
    expect(within(banner).getByRole('button', { name: 'Resume game' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Start new game' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start game' })).not.toBeInTheDocument()
  })

  it('resume restores the same board and difficulty', async () => {
    await open(running)
    await userEvent.click(screen.getByRole('button', { name: 'Resume game' }))
    expect(cell('Row 1, column 1, X')).toBeInTheDocument()
    expect(cell('Row 1, column 2, O')).toBeInTheDocument()
    expect(cell('Row 2, column 2, X')).toBeInTheDocument()
    expect(screen.getByText(/Difficulty: Hard/)).toBeInTheDocument()
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('asks for confirmation before abandoning, and Cancel goes back', async () => {
    await open(running)
    await userEvent.click(screen.getByRole('button', { name: 'Start new game' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Start a new game?' })
    expect(dialog).toHaveTextContent('Your unfinished game will count as a loss (−1 point, streak back to 0).')
    expect(mockedPost).not.toHaveBeenCalled()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('confirm -> abandon -> start with the chosen level, then refreshes the profile', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'easy')
    await open(running)
    const newGame = makeGame({ id: 'g8', difficulty: 'easy' })
    mockedPost.mockResolvedValueOnce({ game: makeGame({ id: 'g7', status: 'lost' }) })
    mockedPost.mockResolvedValueOnce({ game: newGame })
    mockedGet.mockImplementation((path: string) =>
      path === '/api/me'
        ? Promise.resolve({ profile: makeProfile({ score: 3, streak: 0, losses: 3 }) })
        : Promise.reject(new Error('unexpected')),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Start new game' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, start new game' }))
    await screen.findByRole('group', { name: 'Game board' })
    expect(mockedPost).toHaveBeenNthCalledWith(1, '/api/game/abandon', { gameId: 'g7' })
    expect(mockedPost).toHaveBeenNthCalledWith(2, '/api/game/start', { difficulty: 'easy' })
    await waitFor(() => expect(screen.getByText('0/3')).toBeInTheDocument())
    expect(screen.getByText('Your turn')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /empty$/ })).toHaveLength(9)
  })

  it('disables the confirm buttons while starting', async () => {
    await open(running)
    const gate = deferred<{ game: Game }>()
    mockedPost.mockReturnValue(gate.promise)
    await userEvent.click(screen.getByRole('button', { name: 'Start new game' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, start new game' }))
    expect(screen.getByRole('button', { name: 'Starting…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Resume game' })).toBeDisabled()
    gate.resolve({ game: makeGame() })
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('keeps the profile when the /api/me refresh returns no profile or fails', async () => {
    await open(running)
    mockedPost.mockResolvedValueOnce({ game: makeGame({ status: 'lost' }) })
    mockedPost.mockResolvedValueOnce({ game: makeGame({ id: 'g8' }) })
    mockCurrent(null, { profile: null })
    await userEvent.click(screen.getByRole('button', { name: 'Start new game' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, start new game' }))
    await screen.findByRole('group', { name: 'Game board' })
    expect(screen.getByText('1/3')).toBeInTheDocument()
  })

  it('keeps the profile when the /api/me refresh rejects', async () => {
    await open(running)
    mockedPost.mockResolvedValueOnce({ game: makeGame({ status: 'lost' }) })
    mockedPost.mockResolvedValueOnce({ game: makeGame({ id: 'g8' }) })
    mockCurrent(null, new Error('me down'))
    await userEvent.click(screen.getByRole('button', { name: 'Start new game' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, start new game' }))
    await screen.findByRole('group', { name: 'Game board' })
    expect(screen.getByText('1/3')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('abandon 409: reloads the state (game already finished) and goes back to the plain setup', async () => {
    await open(running)
    mockedPost.mockRejectedValue(new ApiError(409, 'GAME_FINISHED', 'done'))
    mockCurrent(null)
    await userEvent.click(screen.getByRole('button', { name: 'Start new game' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, start new game' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('no longer valid')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.queryByText('You have an unfinished game')).not.toBeInTheDocument()
    expect(startButton()).toBeEnabled()
    expect(mockedGet).toHaveBeenCalledWith('/api/game/current')
  })

  it('shows an alert and stays on the confirm dialog when abandoning fails', async () => {
    await open(running)
    mockedPost.mockRejectedValue(new Error('x'))
    await userEvent.click(screen.getByRole('button', { name: 'Start new game' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, start new game' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reach the server. Try again.")
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yes, start new game' })).toBeEnabled()
  })
})

describe('GamePage move flow (AC-7, UI-3)', () => {
  it('locks the board while the bot is thinking, shows the move optimistically, then applies the response', async () => {
    await open()
    await startWith(makeGame())
    const gate = deferred<{ game: Game; profile: Profile }>()
    mockedPost.mockReturnValue(gate.promise)
    await userEvent.click(cell('Row 2, column 2, empty'))

    expect(mockedPost).toHaveBeenLastCalledWith('/api/game/move', { gameId: 'game-1', cell: 4 })
    expect(screen.getByText('Bot is thinking…')).toBeInTheDocument()
    expect(screen.getByText(/The board is locked until the bot moves\./)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Game board' })).toHaveAttribute('aria-busy', 'true')
    expect(cell('Row 2, column 2, X')).toBeInTheDocument()
    expect(cell('Row 1, column 1, empty')).toHaveAttribute('aria-disabled', 'true')

    // clicks while locked do not send a second move
    await userEvent.click(cell('Row 1, column 1, empty'))
    expect(mockedPost).toHaveBeenCalledTimes(2)

    gate.resolve({
      game: makeGame({ cells: '....X...O' }),
      profile: makeProfile({ score: 4, streak: 1, wins: 6, losses: 2, draws: 1 }),
    })
    await screen.findByText('Your turn')
    expect(cell('Row 3, column 3, O')).toBeInTheDocument()
    expect(cell('Row 2, column 2, X')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Game board' })).toHaveAttribute('aria-busy', 'false')
    expect(screen.queryByText('Bot is thinking…')).not.toBeInTheDocument()
  })

  it('plays by keyboard (Enter) on a focused cell', async () => {
    await open()
    await startWith(makeGame())
    mockedPost.mockResolvedValueOnce({ game: makeGame({ cells: 'X...O....' }), profile: PROFILE })
    cell('Row 1, column 1, empty').focus()
    await userEvent.keyboard('{Enter}')
    await screen.findByRole('button', { name: 'Row 2, column 2, O' })
    expect(mockedPost).toHaveBeenLastCalledWith('/api/game/move', { gameId: 'game-1', cell: 0 })
  })

  it('on a network error reloads the current game, shows the generic message and the board reverts', async () => {
    await open()
    const server = makeGame({ cells: 'O........' })
    await startWith(server)
    mockCurrent(server)
    const gate = deferred<never>()
    mockedPost.mockReturnValue(gate.promise)
    await userEvent.click(cell('Row 2, column 2, empty'))
    expect(cell('Row 2, column 2, X')).toBeInTheDocument()
    gate.reject(new ApiError(0, 'NETWORK_ERROR', 'net'))
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reach the server. Try again.")
    expect(mockedGet).toHaveBeenCalledWith('/api/game/current')
    expect(mockedGet).toHaveBeenCalledWith('/api/me')
    expect(cell('Row 2, column 2, empty')).toBeInTheDocument()
    expect(cell('Row 1, column 1, O')).toBeInTheDocument()
    expect(screen.getByText('Your turn')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Game board' })).toHaveAttribute('aria-busy', 'false')
    // can try again; the alert is cleared
    mockedPost.mockResolvedValueOnce({ game: makeGame({ cells: 'O...X...O' }), profile: PROFILE })
    await userEvent.click(cell('Row 2, column 2, empty'))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('move 400 INVALID_MOVE: the board is refreshed from the server and the 4xx message shows', async () => {
    await open()
    await startWith(makeGame())
    // the server already applied the move whose response was lost
    mockCurrent(makeGame({ cells: 'X...O....' }))
    mockedPost.mockRejectedValue(new ApiError(400, 'INVALID_MOVE', 'taken'))
    await userEvent.click(cell('Row 1, column 1, empty'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That move is no longer valid. The board was refreshed.',
    )
    expect(cell('Row 1, column 1, X')).toBeInTheDocument()
    expect(cell('Row 2, column 2, O')).toBeInTheDocument()
    expect(screen.getByText('Your turn')).toBeInTheDocument()
  })

  it('move 409 GAME_FINISHED: returns to the setup', async () => {
    await open()
    await startWith(makeGame())
    mockCurrent(makeGame({ status: 'lost' }))
    mockedPost.mockRejectedValue(new ApiError(409, 'GAME_FINISHED', 'done'))
    await userEvent.click(cell('Row 1, column 1, empty'))
    expect(await screen.findByRole('heading', { name: 'New game' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('That move is no longer valid.')
    expect(screen.queryByRole('group', { name: 'Game board' })).not.toBeInTheDocument()
    expect(startButton()).toBeEnabled()
  })

  it('move 404 with no game on the server returns to the setup and refreshes the profile', async () => {
    await open()
    await startWith(makeGame())
    mockCurrent(null, { profile: makeProfile({ score: 9, streak: 0 }) })
    mockedPost.mockRejectedValue(new ApiError(404, 'GAME_NOT_FOUND', 'gone'))
    await userEvent.click(cell('Row 1, column 1, empty'))
    expect(await screen.findByRole('heading', { name: 'New game' })).toBeInTheDocument()
    expect(screen.getByText('0/3')).toBeInTheDocument()
  })

  it('a move failure followed by a failed reload shows the generic message and keeps the board', async () => {
    await open()
    await startWith(makeGame())
    mockedGet.mockRejectedValue(new Error('down'))
    mockedPost.mockRejectedValue(new ApiError(400, 'INVALID_MOVE', 'x'))
    await userEvent.click(cell('Row 1, column 1, empty'))
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reach the server. Try again.")
    expect(cell('Row 1, column 1, empty')).toBeInTheDocument()
  })

  it('a move failure still restores the board when /api/me fails or has no profile', async () => {
    await open()
    await startWith(makeGame())
    mockCurrent(makeGame({ cells: 'X...O....' }), new Error('me down'))
    mockedPost.mockRejectedValueOnce(new ApiError(400, 'INVALID_MOVE', 'x'))
    await userEvent.click(cell('Row 1, column 1, empty'))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(cell('Row 2, column 2, O')).toBeInTheDocument()
    mockCurrent(makeGame({ cells: 'X...O....' }), { profile: null })
    mockedPost.mockRejectedValueOnce(new ApiError(400, 'INVALID_MOVE', 'x'))
    await userEvent.click(cell('Row 1, column 3, empty'))
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(5))
    expect(cell('Row 2, column 2, O')).toBeInTheDocument()
  })

  it('start 400 reloads the current game and shows the refreshed message', async () => {
    await open()
    mockedPost.mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'bad'))
    await userEvent.click(startButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('That action is no longer valid.')
    expect(mockedGet).toHaveBeenCalledTimes(2)
  })
})

describe('GamePage game over variants (AC-12..15, UI-4)', () => {
  async function finishWith(game: Game, profile: Profile, startLevel = game.difficulty) {
    window.localStorage.setItem(STORAGE_KEY, startLevel)
    await open()
    await startWith(makeGame({ difficulty: game.difficulty }))
    mockedPost.mockResolvedValueOnce({ game, profile })
    await userEvent.click(cell('Row 3, column 3, empty'))
    await screen.findByRole('heading', { name: /You win!|You lose|3 wins in a row!|It's a draw/ })
  }

  it('win: +1, strike on the winning line, stats updated, title focused, board locked', async () => {
    await finishWith(
      makeGame({ status: 'won', cells: 'XXXOO....', result: { scoreDelta: 1, bonus: false } }),
      makeProfile({ score: 5, streak: 2, wins: 7 }),
    )
    expect(screen.getByRole('heading', { name: 'You win!' })).toHaveFocus()
    expect(screen.getByText('Game over', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByLabelText('Score change +1')).toBeInTheDocument()
    expect(screen.getByText('Win streak is now 2/3.')).toBeInTheDocument()
    expect(cell('Row 1, column 1, X')).toHaveClass('board__cell--win')
    expect(document.querySelector('.board__strike--win')).not.toBeNull()
    expect(screen.getByRole('group', { name: 'Game board' })).toHaveAttribute('aria-busy', 'true')
    expect(cell('Row 3, column 1, empty')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('win with bonus: +2 and streak back to 0/3', async () => {
    await finishWith(
      makeGame({ status: 'won', cells: 'XOOX.OX..', result: { scoreDelta: 2, bonus: true } }),
      makeProfile({ score: 6, streak: 0, wins: 8 }),
    )
    expect(screen.getByRole('heading', { name: '3 wins in a row!' })).toBeInTheDocument()
    expect(screen.getByLabelText('Score change +2')).toBeInTheDocument()
    expect(screen.getByText('Win streak starts again at 0/3.')).toBeInTheDocument()
    expect(screen.getByText('0/3', { selector: 'span' })).toBeInTheDocument()
  })

  it('loss: "You lose" with the bot line in the loss tone', async () => {
    await finishWith(
      makeGame({ status: 'lost', cells: 'OOOXX.X..', result: { scoreDelta: -1, bonus: false } }),
      makeProfile({ score: 3, streak: 0, losses: 3 }),
    )
    expect(screen.getByRole('heading', { name: 'You lose' })).toBeInTheDocument()
    expect(screen.getByText('The bot got three O in the top row.')).toBeInTheDocument()
    expect(screen.getByLabelText('Score change −1')).toBeInTheDocument()
    expect(cell('Row 1, column 1, O')).toHaveClass('board__cell--loss')
    expect(document.querySelector('.board__strike--loss')).not.toBeNull()
  })

  it('draw: no win line and no points', async () => {
    await finishWith(
      makeGame({ status: 'draw', cells: 'XOXXOOOXX', result: { scoreDelta: 0, bonus: false } }),
      makeProfile({ draws: 2, streak: 0 }),
    )
    expect(screen.getByRole('heading', { name: "It's a draw" })).toBeInTheDocument()
    expect(screen.getByLabelText('Score change 0')).toBeInTheDocument()
    expect(document.querySelector('.board__strike')).toBeNull()
  })

  it('"Play again" starts a new game with the same difficulty', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'easy')
    await finishWith(
      makeGame({ difficulty: 'hard', status: 'won', cells: 'XXXOO....', result: { scoreDelta: 1, bonus: false } }),
      PROFILE,
    )
    mockedPost.mockResolvedValueOnce({ game: makeGame({ id: 'game-2', difficulty: 'hard' }) })
    await userEvent.click(screen.getByRole('button', { name: 'Play again' }))
    await waitFor(() => expect(screen.getByText('Your turn')).toBeInTheDocument())
    expect(mockedPost).toHaveBeenLastCalledWith('/api/game/start', { difficulty: 'hard' })
    expect(screen.queryByRole('heading', { name: 'You win!' })).not.toBeInTheDocument()
    expect(screen.getByText(/Difficulty: Hard/)).toBeInTheDocument()
  })

  it('"Change difficulty" returns to the setup with the finished level preselected', async () => {
    await finishWith(
      makeGame({ difficulty: 'hard', status: 'draw', cells: 'XOXXOOOXX', result: { scoreDelta: 0, bonus: false } }),
      PROFILE,
      'easy',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Change difficulty' }))
    expect(screen.getByRole('heading', { name: 'New game' })).toBeInTheDocument()
    expect(radio(/Hard/)).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Play again failing shows an alert while keeping the result visible', async () => {
    await finishWith(
      makeGame({ status: 'draw', cells: 'XOXXOOOXX', result: { scoreDelta: 0, bonus: false } }),
      PROFILE,
    )
    mockedPost.mockRejectedValueOnce(new Error('x'))
    await userEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: "It's a draw" })).toBeInTheDocument()
  })

  it('falls back to the auth profile for the streak when the move response has none yet', async () => {
    await open(null, makeProfile({ streak: 2 }))
    await startWith(makeGame())
    expect(screen.getByText('2/3')).toBeInTheDocument()
  })
})
