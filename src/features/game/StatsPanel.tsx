import { formatScore } from '@/web-app-ox/features/admin/sort'
import type { Profile } from '../../../shared/types'

const STREAK_TARGET = 3

function streakHint(streak: number): string {
  if (streak === 0) return 'Win 3 in a row for a +1 bonus'
  const left = STREAK_TARGET - streak
  return `${left} more ${left === 1 ? 'win' : 'wins'} in a row for a +1 bonus`
}

export default function StatsPanel({ profile }: { profile: Profile | null }) {
  if (!profile) return null
  const streak = Math.min(profile.streak, STREAK_TARGET)
  return (
    <section className="card stats" aria-labelledby="stats-title">
      <h2 id="stats-title" className="stats__title">
        Your stats
      </h2>
      <p className="stats__label">Score</p>
      <p className={profile.score < 0 ? 'stats__score neg' : 'stats__score'}>{formatScore(profile.score)}</p>
      <p className="stats__label">Win streak</p>
      <p className="stats__streak">
        <span className="stats__dots" aria-hidden="true">
          {Array.from({ length: STREAK_TARGET }, (_, i) => (
            <span key={i} className={i < streak ? 'stats__dot stats__dot--on' : 'stats__dot'} />
          ))}
        </span>
        <span>
          {streak}/{STREAK_TARGET}
        </span>
      </p>
      <p className="stats__hint">{streakHint(streak)}</p>
      <dl className="stats__record">
        <div>
          <dt>Wins</dt>
          <dd>{profile.wins}</dd>
        </div>
        <div>
          <dt>Losses</dt>
          <dd>{profile.losses}</dd>
        </div>
        <div>
          <dt>Draws</dt>
          <dd>{profile.draws}</dd>
        </div>
      </dl>
      <p className="stats__rules">Win +1 · Loss −1 · Draw 0. 3 wins in a row: +1 bonus, then the streak starts again.</p>
    </section>
  )
}
