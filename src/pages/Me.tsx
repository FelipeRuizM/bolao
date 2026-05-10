import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMatches } from '@/hooks/useMatches'
import { useMyPredictions } from '@/hooks/usePrediction'
import { useSync } from '@/hooks/useSync'
import { TierBadge } from '@/components/TierBadge'
import { useT, useLocale, bcp47 } from '@/i18n'
import { computePoints, multiplierFor, type Tier } from '@/scoring'
import { getTeamEmblemUrl } from '@/utils/emblems'
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

function formatKickoff(ms: number, locale: string): string {
  return new Date(ms).toLocaleString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

      <div className="space-y-3">
        {rows.map(({ match, prediction, result }) => {
          const stageLabel = match.group ? `${match.group}` : t(SHORT_STAGE_KEY[match.stage])
          const mult = multiplierFor(match.stage, match.homeTeam, match.awayTeam)
          return (
            <Link
              key={match.id}
              to={`/matches/${match.id}`}
              className="block relative overflow-hidden bg-slate-900 border border-slate-800/80 rounded-2xl px-6 py-5 sm:px-8 sm:py-6 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10 hover:border-slate-700/80 transition-all duration-300 group"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-500/5 rounded-full blur-3xl group-hover:bg-brand-500/10 transition-colors" />

              <div className="relative flex items-center justify-between text-sm text-slate-400 mb-5">
                <span className="flex items-center gap-2 font-medium tracking-wide">
                  <span>{stageLabel}</span>
                  {mult > 1 && (
                    <span className="text-xs font-bold text-brand-400 border border-brand-500/30 bg-brand-500/10 rounded px-2 py-0.5 shadow-[0_0_8px_rgba(234,179,8,0.2)]">
                      {mult}×
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {match.status === 'SCHEDULED' && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full border font-semibold tracking-wide bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                      {t('me.pendingMatch')}
                    </span>
                  )}
                  {match.status === 'LIVE' && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full border font-semibold tracking-wide bg-red-500/20 text-red-300 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse">
                      {t('matchCard.statusLive')}
                    </span>
                  )}
                  {result && <TierBadge tier={result.tier} points={result.points} />}
                </div>
              </div>

              <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 sm:gap-x-6 w-full">
                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-end gap-1.5 sm:gap-4 min-w-0">
                  <span className="hidden sm:block truncate text-right font-bold text-xl text-slate-200 group-hover:text-white transition-colors min-w-0">{t.team(match.homeTeam)}</span>
                  <img
                    src={getTeamEmblemUrl(match.homeTeam)}
                    alt={`${t.team(match.homeTeam)} emblem`}
                    className="w-11 h-11 sm:w-14 sm:h-14 object-contain drop-shadow-md shrink-0"
                    onError={(e) => { e.currentTarget.src = getTeamEmblemUrl('fallback') }}
                  />
                  <span className="sm:hidden text-center font-bold text-[12px] leading-tight text-slate-200 group-hover:text-white transition-colors line-clamp-2 px-1">{t.team(match.homeTeam)}</span>
                </div>

                <div className="px-1 sm:px-2 shrink-0 flex flex-col items-center gap-1">
                  <div className="flex flex-col items-center bg-brand-500/10 border border-brand-500/30 rounded-xl px-3 sm:px-4 py-1.5 min-w-[5rem]">
                    <span className="text-[9px] uppercase tracking-wider text-brand-400/80 font-semibold leading-none mb-0.5">{t('me.yourPick')}</span>
                    <span className="font-bold text-brand-400 text-lg sm:text-2xl tabular-nums whitespace-nowrap leading-tight">
                      {prediction.home} <span className="text-brand-500/60 mx-0.5">-</span> {prediction.away}
                    </span>
                  </div>
                  {match.score && (
                    <div className="flex flex-col items-center bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 sm:px-4 py-1.5 min-w-[5rem]">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold leading-none mb-0.5">{t('me.actualResult')}</span>
                      <span className="font-bold text-white text-lg sm:text-2xl tabular-nums whitespace-nowrap leading-tight">
                        {match.score.home} <span className="text-slate-500 mx-0.5">-</span> {match.score.away}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-4 min-w-0">
                  <img
                    src={getTeamEmblemUrl(match.awayTeam)}
                    alt={`${t.team(match.awayTeam)} emblem`}
                    className="w-11 h-11 sm:w-14 sm:h-14 object-contain drop-shadow-md shrink-0"
                    onError={(e) => { e.currentTarget.src = getTeamEmblemUrl('fallback') }}
                  />
                  <span className="sm:hidden text-center font-bold text-[12px] leading-tight text-slate-200 group-hover:text-white transition-colors line-clamp-2 px-1">{t.team(match.awayTeam)}</span>
                  <span className="hidden sm:block truncate text-left font-bold text-xl text-slate-200 group-hover:text-white transition-colors min-w-0">{t.team(match.awayTeam)}</span>
                </div>
              </div>

              <div className="relative text-xs sm:text-sm font-medium text-slate-500 mt-5 text-center">
                {formatKickoff(match.kickoffAt, bcp47(locale))}
              </div>
            </Link>
          )
        })}
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
