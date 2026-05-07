import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMatches } from '@/hooks/useMatches'
import { useMyPredictions } from '@/hooks/usePrediction'
import { useSync } from '@/hooks/useSync'
import { TierBadge } from '@/components/TierBadge'
import { useT, useLocale, bcp47 } from '@/i18n'
import { computePoints, type Tier } from '@/scoring'
import type { Match, Prediction, Stage } from '@/types'

const SHORT_STAGE_KEY: Record<Stage, string> = {
  group: 'stages.groupShort',
  r32: 'stages.r32Short',
  r16: 'stages.r16Short',
  qf: 'stages.qfShort',
  sf: 'stages.sfShort',
  '3rd': 'stages.thirdShort',
  final: 'stages.finalShort',
}

interface Row {
  match: Match
  prediction: Prediction
  result?: { points: number; tier: Tier }
}

function formatDate(ms: number, locale: string): string {
  return new Date(ms).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

export function Me() {
  const { user } = useAuth()
  const t = useT()
  const { locale } = useLocale()
  useSync()
  const { matches } = useMatches()
  const myPredictions = useMyPredictions(user?.uid)

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
        })
        result = { points: r.total, tier: r.tier }
      }
      out.push({ match: m, prediction: pred, result })
    }
    out.sort((a, b) => b.match.kickoffAt - a.match.kickoffAt)
    return out
  }, [matches, myPredictions])

  const summary = useMemo(() => {
    let total = 0
    let exact = 0
    for (const r of rows) {
      if (r.result) {
        total += r.result.points
        if (r.result.tier === 'exact') exact++
      }
    }
    return { total, exact, picks: rows.length }
  }, [rows])

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-5">
      <h1 className="text-2xl font-bold px-1">{t('me.title')}</h1>

      <div className="grid grid-cols-3 gap-2">
        <SummaryStat value={summary.total} label={t('me.summaryTotal')} accent />
        <SummaryStat value={summary.exact} label={t('me.summaryExact')} />
        <SummaryStat value={summary.picks} label={t('me.summaryPicks')} />
      </div>

      {matches !== null && rows.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
          {t('me.noPicks')}
        </div>
      )}

      <div className="space-y-2">
        {rows.map(({ match, prediction, result }) => (
          <Link
            key={match.id}
            to={`/matches/${match.id}`}
            className="block bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 active:bg-slate-800/70 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="flex items-center gap-2">
                <span>{t(SHORT_STAGE_KEY[match.stage])}</span>
                <span>·</span>
                <span>{formatDate(match.kickoffAt, bcp47(locale))}</span>
              </span>
              {match.status === 'SCHEDULED' && (
                <span className="text-[10px] text-emerald-400">{t('me.pendingMatch')}</span>
              )}
              {match.status === 'LIVE' && (
                <span className="text-[10px] text-red-400">{t('me.liveMatch')}</span>
              )}
              {result && <TierBadge tier={result.tier} points={result.points} />}
            </div>

            <div className="flex items-center gap-3">
              <span className="flex-1 truncate text-right font-medium text-sm">{match.homeTeam}</span>
              <span className="px-2 text-slate-500 shrink-0 text-xs">vs</span>
              <span className="flex-1 truncate font-medium text-sm">{match.awayTeam}</span>
            </div>

            <div className="mt-2 flex items-center justify-center gap-6 text-sm">
              <span className="text-center">
                <div className="text-[10px] text-slate-500 uppercase">{t('me.yourPick')}</div>
                <div className="font-bold tabular-nums text-brand-500">
                  {prediction.home}–{prediction.away}
                </div>
              </span>
              {match.score && (
                <span className="text-center">
                  <div className="text-[10px] text-slate-500 uppercase">{t('me.actualResult')}</div>
                  <div className="font-bold tabular-nums">
                    {match.score.home}–{match.score.away}
                  </div>
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function SummaryStat({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
      <div
        className={`text-2xl font-bold tabular-nums ${accent ? 'text-brand-500' : 'text-slate-100'}`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{label}</div>
    </div>
  )
}
