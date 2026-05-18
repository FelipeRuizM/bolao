import { Link } from 'react-router-dom'
import { useT, useLocale, bcp47 } from '@/i18n'
import { isPredictionOpen, predictionOpensAt } from '@/api/predictions'
import { isBrazilMatch, multiplierFor } from '@/scoring'
import { useBigGame } from '@/hooks/useMetaConfig'
import type { Match, Prediction, Stage } from '@/types'
import { getTeamEmblemUrl } from '@/utils/emblems'

const SHORT_STAGE_KEY: Record<Stage, string> = {
  group: 'stages.groupShort',
  r32: 'stages.r32Short',
  r16: 'stages.r16Short',
  qf: 'stages.qfShort',
  sf: 'stages.sfShort',
  '3rd': 'stages.thirdShort',
  final: 'stages.finalShort',
}

function formatKickoff(ms: number, locale: string): string {
  return new Date(ms).toLocaleString(locale, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatShortDate(ms: number, locale: string): string {
  return new Date(ms).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

function StatusPill({ status }: { status: Match['status'] }) {
  const t = useT()
  const styles =
    status === 'LIVE'
      ? 'bg-red-500/20 text-red-300 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse'
      : status === 'FT'
      ? 'bg-slate-800 text-slate-400 border-slate-700'
      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  const label =
    status === 'SCHEDULED'
      ? t('matchCard.statusUpcoming')
      : status === 'LIVE'
      ? t('matchCard.statusLive')
      : t('matchCard.statusFinal')
  return <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold tracking-wide ${styles}`}>{label}</span>
}

export function MatchCard({ match, myPrediction }: { match: Match; myPrediction?: Prediction }) {
  const t = useT()
  const { locale } = useLocale()
  const bigGame = useBigGame()
  const isBig = bigGame?.matchId === match.id
  const isBrazil = isBrazilMatch(match.homeTeam, match.awayTeam)
  const stageLabel = match.group ? `${match.group}` : t(SHORT_STAGE_KEY[match.stage])
  const mult = multiplierFor(match.stage, match.homeTeam, match.awayTeam, undefined, {
    matchId: match.id,
    bigGame,
  })
  const isLocked = Date.now() >= match.kickoffAt
  const predictionsOpen = isPredictionOpen(match.kickoffAt)
  const showPickBadge = !!myPrediction
  const showMissingBadge = !myPrediction && !isLocked && predictionsOpen
  const showOpensBadge = !myPrediction && !isLocked && !predictionsOpen

  return (
    <Link
      to={`/matches/${match.id}`}
      className={`block relative overflow-hidden bg-slate-900 border rounded-2xl px-6 py-6 sm:px-8 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group ${
        isBig
          ? 'border-rose-500/40 hover:shadow-rose-500/20 hover:border-rose-500/60'
          : isBrazil
            ? 'border-emerald-500/40 hover:shadow-emerald-500/20 hover:border-emerald-500/60'
            : 'border-slate-800/80 hover:shadow-brand-500/10 hover:border-slate-700/80'
      }`}
    >
      {/* Decorative gradient blob */}
      <div
        className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl transition-colors ${
          isBig
            ? 'bg-rose-500/10 group-hover:bg-rose-500/20'
            : isBrazil
              ? 'bg-gradient-to-br from-emerald-500/15 to-yellow-400/10 group-hover:from-emerald-500/25 group-hover:to-yellow-400/15'
              : 'bg-brand-500/5 group-hover:bg-brand-500/10'
        }`}
      />

      <div className="relative flex items-center justify-between text-sm text-slate-400 mb-6">
        <span className="flex items-center gap-2 font-medium tracking-wide flex-wrap">
          <span>{stageLabel}</span>
          {isBig && (
            <span className="text-[10px] font-extrabold tracking-wider text-rose-300 border border-rose-500/50 bg-rose-500/15 rounded px-2 py-0.5 shadow-[0_0_8px_rgba(244,63,94,0.35)] animate-pop-in">
              {t('matchCard.bigGameBadge')}
            </span>
          )}
          {mult > 1 && (
            <span className="text-xs font-bold text-brand-400 border border-brand-500/30 bg-brand-500/10 rounded px-2 py-0.5 shadow-[0_0_8px_rgba(234,179,8,0.2)]">
              {mult}×
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {showPickBadge && (
            <span className="text-xs font-bold text-brand-400 border border-brand-500/30 bg-brand-500/10 rounded-md px-2 py-0.5 tabular-nums">
              {t('matchCard.pickedBadgePrefix')} {myPrediction!.home}–{myPrediction!.away}
            </span>
          )}
          {showMissingBadge && (
            <span className="text-xs font-semibold text-slate-400 border border-slate-700 rounded-md px-2 py-0.5">
              {t('matchCard.noPick')}
            </span>
          )}
          {showOpensBadge && (
            <span className="text-xs font-semibold text-slate-500 border border-slate-700/60 bg-slate-800/40 rounded-md px-2 py-0.5">
              {t('matchCard.opensAt', { when: formatShortDate(predictionOpensAt(match.kickoffAt), bcp47(locale)) })}
            </span>
          )}
          <StatusPill status={match.status} />
        </div>
      </div>

      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 sm:gap-x-6 w-full">
        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-end gap-1.5 sm:gap-4 min-w-0">
          <span className="hidden sm:block truncate text-right font-bold text-2xl text-slate-200 group-hover:text-white transition-colors min-w-0">{t.team(match.homeTeam)}</span>
          <img
            src={getTeamEmblemUrl(match.homeTeam)}
            alt={`${t.team(match.homeTeam)} emblem`}
            className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-md shrink-0"
            onError={(e) => { e.currentTarget.src = getTeamEmblemUrl('fallback') }}
          />
          <span className="sm:hidden text-center font-bold text-[13px] leading-tight text-slate-200 group-hover:text-white transition-colors line-clamp-2 px-1">{t.team(match.homeTeam)}</span>
        </div>
        
        <div className="px-1 sm:px-2 text-slate-500 shrink-0 text-center flex items-center justify-center">
          {match.score ? (
            <span className="font-bold text-white text-xl sm:text-3xl tabular-nums bg-slate-800/80 px-3 sm:px-4 py-1.5 rounded-xl border border-slate-700/50 shadow-inner whitespace-nowrap">
              {match.score.home} <span className="text-slate-500 mx-0.5 sm:mx-1">-</span> {match.score.away}
            </span>
          ) : (
            <span className="text-xs sm:text-sm font-bold text-slate-600 bg-slate-800/50 px-2 sm:px-3 py-1.5 rounded-lg whitespace-nowrap">{t('matchCard.vs')}</span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-4 min-w-0">
          <img
            src={getTeamEmblemUrl(match.awayTeam)}
            alt={`${t.team(match.awayTeam)} emblem`}
            className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-md shrink-0"
            onError={(e) => { e.currentTarget.src = getTeamEmblemUrl('fallback') }}
          />
          <span className="sm:hidden text-center font-bold text-[13px] leading-tight text-slate-200 group-hover:text-white transition-colors line-clamp-2 px-1">{t.team(match.awayTeam)}</span>
          <span className="hidden sm:block truncate text-left font-bold text-2xl text-slate-200 group-hover:text-white transition-colors min-w-0">{t.team(match.awayTeam)}</span>
        </div>
      </div>

      <div className="relative text-sm font-medium text-slate-500 mt-6 text-center">
        {formatKickoff(match.kickoffAt, bcp47(locale))}
      </div>
    </Link>
  )
}
