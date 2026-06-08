import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import { useAuth } from '@/hooks/useAuth'
import { useMatches } from '@/hooks/useMatches'
import { useBigGames } from '@/hooks/useMetaConfig'
import { usePlayerPredictions } from '@/hooks/usePrediction'
import { useUsers, displayNameFor } from '@/hooks/useUsers'
import { useSync } from '@/hooks/useSync'
import { MatchBreakdownCard, type BreakdownResult } from '@/components/MatchBreakdownCard'
import { useT } from '@/i18n'
import { computePoints } from '@/scoring'
import type { Match, Prediction, UserScore } from '@/types'

interface Row {
  match: Match
  prediction: Prediction
  result?: BreakdownResult
}

export function Player() {
  const { uid } = useParams<{ uid: string }>()
  const { user } = useAuth()
  const t = useT()
  useSync()
  const users = useUsers()
  const { matches } = useMatches()
  const bigGames = useBigGames()
  const predictions = usePlayerPredictions(uid, matches)
  const [score, setScore] = useState<UserScore | null>(null)

  useEffect(() => {
    if (!uid) return
    return onValue(ref(db, `scores/${uid}`), (snap) => {
      setScore((snap.val() as UserScore | null) ?? null)
    })
  }, [uid])

  const rows = useMemo<Row[]>(() => {
    if (!matches || !predictions) return []
    const out: Row[] = []
    for (const m of matches) {
      if (m.status === 'SCHEDULED') continue
      const pred = predictions[m.id]
      if (!pred) continue
      let result: BreakdownResult | undefined
      if (m.status === 'FT' && m.score) {
        const r = computePoints({
          prediction: { home: pred.home, away: pred.away },
          actual: m.score,
          stage: m.stage,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          matchId: m.id,
          bigGames,
        })
        result = { points: r.total, tier: r.tier }
      }
      out.push({ match: m, prediction: pred, result })
    }
    out.sort((a, b) => b.match.kickoffAt - a.match.kickoffAt)
    return out
  }, [matches, predictions, bigGames])

  const summary = useMemo(() => {
    let matchPts = 0
    let exact = 0
    let scored = 0
    let finished = 0
    for (const r of rows) {
      if (!r.result) continue
      finished++
      matchPts += r.result.points
      if (r.result.tier === 'exact') exact++
      if (r.result.points > 0) scored++
    }
    const accuracy = finished > 0 ? Math.round((scored / finished) * 100) : null
    return { matchPts, exact, picks: rows.length, accuracy }
  }, [rows])

  const profile = uid ? users[uid] : undefined
  const name = uid ? displayNameFor(uid, profile) : ''
  const total = score?.total ?? summary.matchPts
  const bonusPts = score?.bonusPts ?? 0
  const isSelf = !!user && user.uid === uid
  const loading = matches === null || predictions === null
  // `users` is filtered to the current group; once it has loaded (it always
  // contains the viewer's own profile), a uid that's missing belongs to another
  // group — don't render their breakdown.
  const crossGroup = !isSelf && !!uid && Object.keys(users).length > 0 && !users[uid]

  if (crossGroup) {
    return (
      <div className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-5">
        <Link to="/" className="inline-block text-sm text-brand-500 hover:text-brand-400 font-medium">
          ← {t('player.back')}
        </Link>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
          {t('player.notFound')}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-5">
      <Link to="/" className="inline-block text-sm text-brand-500 hover:text-brand-400 font-medium">
        ← {t('player.back')}
      </Link>

      <div className="flex items-center justify-between gap-3 px-1">
        <h1 className="text-2xl font-bold truncate">
          {isSelf ? t('player.titleSelf') : name}
        </h1>
        <div className="text-right shrink-0">
          <div className="text-2xl font-extrabold text-brand-500 tabular-nums leading-none">{total}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">
            {t('me.summaryTotal')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SummaryStat value={summary.exact} label={t('me.summaryExact')} />
        <SummaryStat value={summary.picks} label={t('me.summaryPicks')} />
        <SummaryStat
          display={summary.accuracy === null ? '—' : `${summary.accuracy}%`}
          label={t('me.summaryAccuracy')}
        />
      </div>

      {bonusPts > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-slate-300">{t('player.bonusPoints')}</span>
          <span className="font-bold text-brand-500 tabular-nums">+{bonusPts}</span>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
          {t('player.noPicks')}
        </div>
      )}

      <div className="space-y-3">
        {rows.map(({ match, prediction, result }) => (
          <MatchBreakdownCard
            key={match.id}
            match={match}
            prediction={prediction}
            result={result}
            bigGames={bigGames}
            pickLabel={t('me.yourPick')}
          />
        ))}
      </div>
    </div>
  )
}

function SummaryStat({
  value,
  display,
  label,
}: {
  value?: number
  display?: string
  label: string
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
      <div className="text-2xl font-bold tabular-nums text-slate-100">{display ?? value ?? 0}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{label}</div>
    </div>
  )
}
