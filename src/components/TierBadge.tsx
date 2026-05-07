import { useT } from '@/i18n'
import type { Tier } from '@/scoring'

const TIER_KEY: Record<Tier, string> = {
  exact: 'tier.exact',
  goalDifference: 'tier.goalDifference',
  winnerScore: 'tier.winnerScore',
  loserScore: 'tier.loserScore',
  outcome: 'tier.outcome',
  wrong: 'tier.wrong',
}

const TIER_STYLE: Record<Tier, string> = {
  exact: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  goalDifference: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  winnerScore: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  loserScore: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  outcome: 'bg-slate-700/40 text-slate-300 border-slate-600',
  wrong: 'bg-red-500/10 text-red-300 border-red-500/30',
}

export function TierBadge({ tier, points }: { tier: Tier; points: number }) {
  const t = useT()
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold border rounded-full px-2 py-0.5 tabular-nums ${TIER_STYLE[tier]}`}
    >
      <span>{points}</span>
      <span className="text-[10px] opacity-80">{t('points.pts')}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-80">·</span>
      <span className="text-[10px] uppercase tracking-wider">{t(TIER_KEY[tier])}</span>
    </span>
  )
}
