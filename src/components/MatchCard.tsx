import { Link } from 'react-router-dom'
import type { Match, Prediction, Stage } from '@/types'

const STAGE_LABEL: Record<Stage, string> = {
  group: 'Group',
  r32: 'R32',
  r16: 'R16',
  qf: 'QF',
  sf: 'SF',
  '3rd': '3rd',
  final: 'Final',
}

function formatKickoff(ms: number): string {
  const d = new Date(ms)
  return d.toLocaleString(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusPill({ status }: { status: Match['status'] }) {
  const styles =
    status === 'LIVE'
      ? 'bg-red-500/20 text-red-300 border-red-500/30'
      : status === 'FT'
      ? 'bg-slate-700 text-slate-300 border-slate-600'
      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  const label = status === 'SCHEDULED' ? 'Upcoming' : status === 'LIVE' ? 'LIVE' : 'Final'
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${styles}`}>{label}</span>
}

export function MatchCard({ match, myPrediction }: { match: Match; myPrediction?: Prediction }) {
  const stageLabel = match.group ? `${match.group}` : STAGE_LABEL[match.stage]
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
              ✓ {myPrediction!.home}–{myPrediction!.away}
            </span>
          )}
          {showMissingBadge && (
            <span className="text-[10px] font-semibold text-slate-400 border border-slate-700 rounded px-1.5">
              No pick
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
            <span className="text-xs">vs</span>
          )}
        </span>
        <span className="flex-1 truncate font-medium">{match.awayTeam}</span>
      </div>
      <div className="text-xs text-slate-500 mt-1.5 text-center">{formatKickoff(match.kickoffAt)}</div>
    </Link>
  )
}
