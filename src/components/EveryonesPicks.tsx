import { useMemo } from 'react'
import { useMatchPredictions } from '@/hooks/useMatchPredictions'
import { useUsers, displayNameFor } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n'
import { computePoints } from '@/scoring'
import { TierBadge } from './TierBadge'
import type { Match, Prediction } from '@/types'

interface Row {
  uid: string
  name: string
  prediction?: Prediction
  points?: { total: number; tier: import('@/scoring').Tier }
}

export function EveryonesPicks({ match }: { match: Match }) {
  const { predictions, error } = useMatchPredictions(match.id, match.kickoffAt)
  const users = useUsers()
  const { user } = useAuth()
  const t = useT()

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = Object.keys(users).map((uid) => {
      const profile = users[uid]
      const pred = predictions?.[uid]
      let points: Row['points']
      // Score finished matches, and live ones too — against the current score, so
      // everyone can see what their pick is worth if the match ended right now.
      if (pred && match.score && (match.status === 'FT' || match.status === 'LIVE')) {
        const r = computePoints({
          prediction: { home: pred.home, away: pred.away },
          actual: match.score,
          stage: match.stage,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
        })
        points = { total: r.total, tier: r.tier }
      }
      return { uid, name: displayNameFor(uid, profile), prediction: pred, points }
    })
    // Sort by total predicted goals (most first); users with no pick sink to the
    // bottom. Tiebreak by name.
    list.sort((a, b) => {
      const aHasPick = a.prediction ? 0 : 1
      const bHasPick = b.prediction ? 0 : 1
      if (aHasPick !== bHasPick) return aHasPick - bHasPick
      const aGoals = a.prediction ? a.prediction.home + a.prediction.away : 0
      const bGoals = b.prediction ? b.prediction.home + b.prediction.away : 0
      if (aGoals !== bGoals) return bGoals - aGoals
      return a.name.localeCompare(b.name)
    })
    return list
  }, [users, predictions, match])

  // The hook only returns data once kickoff has passed (when picks lock and the
  // rules permit the read), so a null result means "not revealed yet" — render
  // nothing until then, regardless of whether the live-score sync has flipped
  // the match to LIVE.
  if (predictions === null && !error) return null

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{t('matchDetail.everyonesPicks')}</h2>
        {match.status === 'LIVE' && (
          <span className="text-[11px] text-red-400 uppercase tracking-wider">
            {t('matchDetail.matchInProgress')}
          </span>
        )}
      </div>

      {match.status === 'LIVE' && match.score && (
        <p className="text-xs text-slate-500">{t('matchDetail.livePicksHint')}</p>
      )}

      {error && <p className="text-sm text-red-400 break-words">{error}</p>}
      {predictions !== null && rows.length === 0 && (
        <p className="text-sm text-slate-400">{t('matchDetail.noPicksFromAnyone')}</p>
      )}

      <ul className="divide-y divide-slate-800">
        {rows.map((row) => (
          <li
            key={row.uid}
            className={`py-2.5 flex items-center gap-3 ${
              row.uid === user?.uid ? 'bg-slate-800/30 -mx-4 px-4' : ''
            }`}
          >
            <span className="flex-1 truncate font-medium text-sm">{row.name}</span>
            {row.prediction ? (
              <span className="font-bold tabular-nums text-base">
                {row.prediction.home}–{row.prediction.away}
              </span>
            ) : (
              <span className="text-xs text-slate-500 italic">{t('matchDetail.noPickFromUser')}</span>
            )}
            {row.points && <TierBadge tier={row.points.tier} points={row.points.total} />}
          </li>
        ))}
      </ul>
    </section>
  )
}
