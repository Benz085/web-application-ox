import { Link } from 'react-router-dom'
import { useAuth } from 'web-app-ox/auth/useAuth'
import type { Profile } from 'web-app-ox/api/types'
import type { LeaderboardEntry } from '../../../shared/types'
import { useLeaderboard } from 'web-app-ox/features/leaderboard/useLeaderboard'

/**
 * The leaderboard payload has no uid (and no email), so the current user's row is matched by
 * display name + photo, narrowed by stats when several players share the same name.
 */
function findOwnRank(players: LeaderboardEntry[], profile: Profile | null): number | null {
  if (!profile) return null
  const same = players.filter((p) => p.displayName === profile.displayName && p.photoURL === profile.photoURL)
  if (same.length === 0) return null
  const exact = same.find(
    (p) =>
      p.score === profile.score &&
      p.wins === profile.wins &&
      p.losses === profile.losses &&
      p.draws === profile.draws,
  )
  return (exact ?? same[0]).rank
}

function formatScore(score: number): string {
  return score < 0 ? `−${Math.abs(score)}` : String(score)
}

function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2)
  return letters.toUpperCase() || '?'
}

function RankCell({ rank }: { rank: number }) {
  const medal = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : null
  return <span className={medal ? `rank rank--${medal}` : 'rank'}>{rank}</span>
}

export default function LeaderboardPage() {
  const { profile } = useAuth()
  const { state, retry } = useLeaderboard()

  return (
    <section aria-labelledby="leaderboard-title">
      <h1 id="leaderboard-title">Leaderboard</h1>
      <p className="page-sub">All players ranked by score.</p>

      {state.status === 'loading' ? (
        <div className="state" role="status">
          <span className="spinner" aria-hidden="true" />
          <p className="state__text">Loading…</p>
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="state">
          <div className="alert" role="alert">
            <p className="alert__title">Couldn&apos;t load the leaderboard</p>
            <p className="alert__text">Couldn&apos;t reach the server. Try again.</p>
          </div>
          <button type="button" className="btn btn--primary" onClick={retry}>
            Try again
          </button>
        </div>
      ) : null}

      {state.status === 'ready' && state.players.length === 0 ? (
        <div className="card state state--card">
          <h2 className="state__title">No players yet</h2>
          <p className="state__text">Scores show up here after a game is finished.</p>
          <Link className="btn btn--primary" to="/">
            Play a game
          </Link>
        </div>
      ) : null}

      {state.status === 'ready' && state.players.length > 0 ? (
        <LeaderboardTable players={state.players} ownRank={findOwnRank(state.players, profile)} />
      ) : null}
    </section>
  )
}

function LeaderboardTable({ players, ownRank }: { players: LeaderboardEntry[]; ownRank: number | null }) {
  return (
    <div className="card table-card">
      <table className="data-table lb-table">
        <caption className="sr-only">Players ranked by score</caption>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Player</th>
            <th scope="col" className="num">
              Score
            </th>
            <th scope="col" className="num">
              <span className="th-full">Wins</span>
              <span className="th-short" aria-hidden="true">
                W
              </span>
            </th>
            <th scope="col" className="num">
              <span className="th-full">Losses</span>
              <span className="th-short" aria-hidden="true">
                L
              </span>
            </th>
            <th scope="col" className="num">
              <span className="th-full">Draws</span>
              <span className="th-short" aria-hidden="true">
                D
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => {
            const mine = p.rank === ownRank
            return (
              <tr key={p.rank} className={mine ? 'is-you' : undefined} aria-current={mine ? 'true' : undefined}>
                <td>
                  <RankCell rank={p.rank} />
                </td>
                <th scope="row" className="player-cell">
                  <span className="player">
                    {p.photoURL ? (
                      <img className="avatar" src={p.photoURL} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="avatar avatar--initials" aria-hidden="true">
                        {initialsOf(p.displayName)}
                      </span>
                    )}
                    <span className="player__name">{p.displayName}</span>
                    {mine ? <span className="pill-you">You</span> : null}
                  </span>
                </th>
                <td className={p.score < 0 ? 'num neg' : 'num'}>{formatScore(p.score)}</td>
                <td className="num">{p.wins}</td>
                <td className="num">{p.losses}</td>
                <td className="num">{p.draws}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="table-foot">{players.length === 1 ? '1 player' : `${players.length} players`}</p>
    </div>
  )
}
