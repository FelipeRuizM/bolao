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

// One distinct hue per tier, roughly best → worst: green, teal, blue, violet,
// amber, red. Full literal class strings so Tailwind's JIT keeps them.
const TIER_STYLE: Record<Tier, string> = {
  exact: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  goalDifference: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  winnerScore: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  loserScore: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  outcome: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  wrong: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
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
