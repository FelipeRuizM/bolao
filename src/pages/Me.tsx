import { useEffect, useMemo, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import { useAuth } from '@/hooks/useAuth'
import { useMatches } from '@/hooks/useMatches'
import { useBigGames } from '@/hooks/useMetaConfig'
import { useMyPredictions } from '@/hooks/usePrediction'
import { useUsers } from '@/hooks/useUsers'
import { useSync } from '@/hooks/useSync'
import { MatchBreakdownCard } from '@/components/MatchBreakdownCard'
import { useT } from '@/i18n'
import { computePoints, type Tier } from '@/scoring'
import type { Match, Prediction, UserScore } from '@/types'

interface Row {
  match: Match
  prediction: Prediction
  result?: { points: number; tier: Tier }
}

export function Me() {
  const { user } = useAuth()
  const t = useT()
  const bigGames = useBigGames()
  useSync()
  const { matches } = useMatches()
  const myPredictions = useMyPredictions(user?.uid)
  const users = useUsers()
  const [allScores, setAllScores] = useState<Record<string, UserScore> | null>(null)

  useEffect(() => {
    return onValue(ref(db, 'scores'), (snap) => {
      setAllScores((snap.val() ?? {}) as Record<string, UserScore>)
    })
  }, [])

  const rows = useMemo<Row[]>(() => {
    if (!matches) return []
    const out: Row[] = []
    for (const m of matches) {
      const pred = myPredictions[m.id]
      if (!pred) continue
      let result: Row['result']
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
  }, [matches, myPredictions, bigGames])

  const summary = useMemo(() => {
    let total = 0
    let exact = 0
    let scored = 0
    let finished = 0
    // streak = consecutive most-recent FT picks with > 0 points
    let streak = 0
    let streakOpen = true
    for (const r of rows) {
      if (!r.result) continue
      finished++
      total += r.result.points
      if (r.result.tier === 'exact') exact++
      if (r.result.points > 0) scored++
      if (streakOpen) {
        if (r.result.points > 0) streak++
        else streakOpen = false
      }
    }
    const accuracy = finished > 0 ? Math.round((scored / finished) * 100) : null
    return { total, exact, picks: rows.length, accuracy, streak, finished }
  }, [rows])

  const vsAvg = useMemo(() => {
    if (!user || !allScores) return null
    // Average over the current user's group only, so the comparison never leaks
    // the other friend group's performance.
    const groupUids = Object.keys(users)
    if (groupUids.length === 0) return null
    const totals = groupUids.map((uid) => allScores[uid]?.total ?? 0)
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length
    const mine = allScores[user.uid]?.total ?? summary.total
    return Math.round(mine - avg)
  }, [allScores, users, user, summary.total])

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-5">
      <h1 className="text-2xl font-bold px-1">{t('me.title')}</h1>

      <div className="grid grid-cols-3 gap-2">
        <SummaryStat value={summary.total} label={t('me.summaryTotal')} accent />
        <SummaryStat value={summary.exact} label={t('me.summaryExact')} />
        <SummaryStat value={summary.picks} label={t('me.summaryPicks')} />
        <SummaryStat
          display={summary.accuracy === null ? '—' : `${summary.accuracy}%`}
          label={t('me.summaryAccuracy')}
        />
        <SummaryStat value={summary.streak} label={t('me.summaryStreak')} />
        <SummaryStat
          display={
            vsAvg === null
              ? '—'
              : vsAvg > 0
                ? `+${vsAvg}`
                : vsAvg < 0
                  ? `${vsAvg}`
                  : '='
          }
          label={t('me.summaryVsAvg')}
          tone={vsAvg === null ? 'neutral' : vsAvg > 0 ? 'positive' : vsAvg < 0 ? 'negative' : 'neutral'}
        />
      </div>

      {matches !== null && rows.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
          {t('me.noPicks')}
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
  accent = false,
  tone = 'neutral',
}: {
  value?: number
  display?: string
  label: string
  accent?: boolean
  tone?: 'neutral' | 'positive' | 'negative'
}) {
  const colorClass = accent
    ? 'text-brand-500'
    : tone === 'positive'
      ? 'text-emerald-400'
      : tone === 'negative'
        ? 'text-rose-400'
        : 'text-slate-100'
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${colorClass}`}>{display ?? value ?? 0}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{label}</div>
    </div>
  )
}
