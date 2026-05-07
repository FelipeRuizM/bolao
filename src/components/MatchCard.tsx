import { Link } from 'react-router-dom'
import { useT, useLocale, bcp47 } from '@/i18n'
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
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusPill({ status }: { status: Match['status'] }) {
  const t = useT()
  const styles =
    status === 'LIVE'
      ? 'bg-red-500/20 text-red-300 border-red-500/30'
      : status === 'FT'
      ? 'bg-slate-700 text-slate-300 border-slate-600'
      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  const label =
    status === 'SCHEDULED'
      ? t('matchCard.statusUpcoming')
      : status === 'LIVE'
      ? t('matchCard.statusLive')
      : t('matchCard.statusFinal')
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${styles}`}>{label}</span>
}

export function MatchCard({ match, myPrediction }: { match: Match; myPrediction?: Prediction }) {
  const t = useT()
  const { locale } = useLocale()
  const stageLabel = match.group ? `${match.group}` : t(SHORT_STAGE_KEY[match.stage])
  const isBrazil = match.homeTeam === 'Brazil' || match.awayTeam === 'Brazil'
  const isLocked = Date.now() >= match.kickoffAt
  const showPickBadge = !!myPrediction
  const showMissingBadge = !myPrediction && !isLocked

  return (
    <Link
      to={`/matches/${match.id}`}
      className="block bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 active:bg-slate-800/70 hover:border-slate-700 transition-colors"
    >
      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
        <span className="flex items-center gap-2">
          <span>{stageLabel}</span>
          {isBrazil && (
            <span className="text-[10px] font-bold text-amber-400 border border-amber-500/40 bg-amber-500/10 rounded px-1.5">
              3×
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          {showPickBadge && (
            <span className="text-[10px] font-bold text-brand-500 border border-brand-500/40 bg-brand-500/10 rounded px-1.5 tabular-nums">
              {t('matchCard.pickedBadgePrefix')} {myPrediction!.home}–{myPrediction!.away}
            </span>
          )}
          {showMissingBadge && (
            <span className="text-[10px] font-semibold text-slate-400 border border-slate-700 rounded px-1.5">
              {t('matchCard.noPick')}
            </span>
          )}
          <StatusPill status={match.status} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex-1 truncate text-right font-medium">{match.homeTeam}</span>
        <span className="px-2 text-slate-500 shrink-0">
          {match.score ? (
            <span className="font-bold text-slate-100 text-lg tabular-nums">
              {match.score.home} – {match.score.away}
            </span>
          ) : (
            <span className="text-xs">{t('matchCard.vs')}</span>
          )}
        </span>
        <span className="flex-1 truncate font-medium">{match.awayTeam}</span>
      </div>
      <div className="text-xs text-slate-500 mt-1.5 text-center">
        {formatKickoff(match.kickoffAt, bcp47(locale))}
      </div>
    </Link>
  )
}
