import { Link } from 'react-router-dom'
import { bcp47, useLocale, useT } from '@/i18n'
import { isBigGame, isBrazilMatch, multiplierFor, type BigGames, type Tier } from '@/scoring'
import { TierBadge } from '@/components/TierBadge'
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

function formatKickoff(ms: number, locale: string): string {
  return new Date(ms).toLocaleString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export interface BreakdownResult {
  points: number
  tier: Tier
}

/**
 * One match's scoring breakdown rendered as a card: the pick, the actual
 * result, the tier badge and points, plus stage/Brazil/big-game multiplier.
 * Shared by the "My Picks" page and the per-player breakdown page.
 */
export function MatchBreakdownCard({
  match,
  prediction,
  result,
  bigGames,
  pickLabel,
}: {
  match: Match
  prediction: Prediction
  result?: BreakdownResult
  bigGames: BigGames
  pickLabel: string
}) {
  const t = useT()
  const { locale } = useLocale()
  const stageLabel = match.group ? `${match.group}` : t(SHORT_STAGE_KEY[match.stage])
  const isBig = isBigGame(match.id, bigGames)
  const isBrazil = isBrazilMatch(match.homeTeam, match.awayTeam)
  const mult = multiplierFor(match.stage, match.homeTeam, match.awayTeam, undefined, {
    matchId: match.id,
    bigGames,
  })
  const isExact = result?.tier === 'exact'

  return (
    <Link
      to={`/matches/${match.id}`}
      className={`block relative overflow-hidden bg-slate-900 border rounded-2xl px-6 py-5 sm:px-8 sm:py-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group ${
        isExact
          ? 'border-emerald-500/40 shadow-[0_0_18px_rgba(16,185,129,0.18)] hover:shadow-emerald-500/25'
          : isBig
            ? 'border-rose-500/40 hover:shadow-rose-500/20 hover:border-rose-500/60'
            : isBrazil
              ? 'border-emerald-500/40 hover:shadow-emerald-500/20 hover:border-emerald-500/60'
              : 'border-slate-800/80 hover:shadow-brand-500/10 hover:border-slate-700/80'
      }`}
    >
      <div
        className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl transition-colors ${
          isExact
            ? 'bg-emerald-500/10 group-hover:bg-emerald-500/15'
            : isBig
              ? 'bg-rose-500/10 group-hover:bg-rose-500/20'
              : isBrazil
                ? 'bg-gradient-to-br from-emerald-500/15 to-yellow-400/10 group-hover:from-emerald-500/25 group-hover:to-yellow-400/15'
                : 'bg-brand-500/5 group-hover:bg-brand-500/10'
        }`}
      />

      <div className="relative flex items-center justify-between text-sm text-slate-400 mb-5">
        <span className="flex items-center gap-2 font-medium tracking-wide flex-wrap">
          <span>{stageLabel}</span>
          {isBig && (
            <span className="text-[10px] font-extrabold tracking-wider text-rose-300 border border-rose-500/50 bg-rose-500/15 rounded px-2 py-0.5 shadow-[0_0_8px_rgba(244,63,94,0.35)]">
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
          {result && (
            <span className={isExact ? 'inline-block rounded-full animate-glow-pulse' : undefined}>
              <TierBadge tier={result.tier} points={result.points} />
            </span>
          )}
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
            <span className="text-[9px] uppercase tracking-wider text-brand-400/80 font-semibold leading-none mb-0.5">{pickLabel}</span>
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
}
