import { useMemo, useState, type ChangeEvent } from 'react'
import type { AdminPlayer } from '../../../shared/types'
import { useAdminPlayers } from 'web-app-ox/features/admin/useAdminPlayers'
import {
  DEFAULT_SORT,
  SORT_KEYS,
  SORT_LABELS,
  formatLastPlayed,
  formatScore,
  sortPlayers,
  type SortDir,
  type SortKey,
  type SortState,
} from 'web-app-ox/features/admin/sort'

const COLUMNS: SortKey[] = ['email', 'score', 'streak', 'wins', 'losses', 'draws', 'lastPlayedAt']

function firstDir(key: SortKey): SortDir {
  return key === 'email' ? 'asc' : 'desc'
}

function ariaSort(sort: SortState, key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) return 'none'
  return sort.dir === 'asc' ? 'ascending' : 'descending'
}

export default function AdminPage() {
  const { state, retry } = useAdminPlayers()
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT)

  const players = state.status === 'ready' ? state.players : null
  const sorted = useMemo(() => (players ? sortPlayers(players, sort) : []), [players, sort])

  function toggle(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: firstDir(key) },
    )
  }

  function onSelect(event: ChangeEvent<HTMLSelectElement>) {
    const [key, dir] = event.target.value.split(':')
    setSort({ key: key as SortKey, dir: dir as SortDir })
  }

  return (
    <section aria-labelledby="admin-title">
      <h1 id="admin-title">Admin &middot; Players</h1>
      <p className="page-sub">
        <span className="pill-amber">Visible to admins only</span>
        {players ? <span> &middot; {players.length === 1 ? '1 player' : `${players.length} players`}</span> : null}
      </p>

      {state.status === 'loading' ? (
        <div className="state" role="status">
          <span className="spinner" aria-hidden="true" />
          <p className="state__text">Loading…</p>
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="state">
          <div className="alert" role="alert">
            <p className="alert__title">Couldn&apos;t load players</p>
            <p className="alert__text">Couldn&apos;t reach the server. Try again.</p>
          </div>
          <button type="button" className="btn btn--primary" onClick={retry}>
            Try again
          </button>
        </div>
      ) : null}

      {players && players.length === 0 ? (
        <div className="card state state--card">
          <h2 className="state__title">No players yet</h2>
          <p className="state__text">Players appear here after they sign in.</p>
        </div>
      ) : null}

      {players && players.length > 0 ? (
        <>
          <p className="table-note">
            Times are shown in your local time zone. &quot;&mdash;&quot; means the player has not finished a game.
          </p>

          <div className="sort-select">
            <label htmlFor="admin-sort">Sort by</label>
            <select id="admin-sort" value={`${sort.key}:${sort.dir}`} onChange={onSelect}>
              {SORT_KEYS.flatMap((key) =>
                (['desc', 'asc'] as const).map((dir) => (
                  <option key={`${key}:${dir}`} value={`${key}:${dir}`}>
                    {SORT_LABELS[key]} ({dir === 'desc' ? 'high to low' : 'low to high'})
                  </option>
                )),
              )}
            </select>
          </div>

          <div className="card table-card admin-table">
            <table className="data-table">
              <caption className="sr-only">All players</caption>
              <thead>
                <tr>
                  {COLUMNS.map((key) => {
                    const active = sort.key === key
                    return (
                      <th
                        key={key}
                        scope="col"
                        className={key === 'email' || key === 'lastPlayedAt' ? undefined : 'num'}
                        aria-sort={ariaSort(sort, key)}
                      >
                        <button
                          type="button"
                          className={active ? 'sort-btn is-active' : 'sort-btn'}
                          onClick={() => toggle(key)}
                        >
                          {SORT_LABELS[key]}
                          <span className="sort-btn__icon" aria-hidden="true">
                            {active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </button>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.uid}>
                    <th scope="row" className="email-cell">
                      {p.email}
                    </th>
                    <td className={p.score < 0 ? 'num neg' : 'num'}>{formatScore(p.score)}</td>
                    <td className="num">{p.streak}/3</td>
                    <td className="num">{p.wins}</td>
                    <td className="num">{p.losses}</td>
                    <td className="num">{p.draws}</td>
                    <td>{formatLastPlayed(p.lastPlayedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="admin-cards" aria-label="Players">
            {sorted.map((p) => (
              <PlayerCard key={p.uid} player={p} />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}

function PlayerCard({ player: p }: { player: AdminPlayer }) {
  return (
    <li className="card admin-card">
      <p className="admin-card__email">{p.email}</p>
      <dl className="admin-card__stats">
        <div>
          <dt>Score</dt>
          <dd className={p.score < 0 ? 'neg' : undefined}>{formatScore(p.score)}</dd>
        </div>
        <div>
          <dt>Streak</dt>
          <dd>{p.streak}/3</dd>
        </div>
        <div>
          <dt>W / L / D</dt>
          <dd>
            {p.wins} / {p.losses} / {p.draws}
          </dd>
        </div>
      </dl>
      <p className="admin-card__last">Last played {formatLastPlayed(p.lastPlayedAt)}</p>
    </li>
  )
}
