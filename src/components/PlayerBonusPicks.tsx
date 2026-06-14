import { useBonusPick, useBonusAnswers } from '@/hooks/useBonus'
import { useT } from '@/i18n'
import { BONUS_KEYS, normalizeBonusAnswer, type BonusAnswers, type BonusKey } from '@/scoring'
import type { BonusPick } from '@/types'

/** Per-category emoji + whether the value is a team (translatable) or a name. */
const FIELD_META: Record<BonusKey, { emoji: string; kind: 'team' | 'player' }> = {
  tournamentWinner: { emoji: '🏆', kind: 'team' },
  topScorer: { emoji: '⚽', kind: 'player' },
  bestPlayer: { emoji: '⭐', kind: 'player' },
  bestYoungPlayer: { emoji: '🌱', kind: 'player' },
  bestGoalkeeper: { emoji: '🧤', kind: 'player' },
}

function isCorrect(key: BonusKey, pick: BonusPick, answers: BonusAnswers): boolean {
  const answer = answers[key]
  const value = pick[key]
  return !!answer && !!value && normalizeBonusAnswer(value) === normalizeBonusAnswer(answer)
}

/**
 * A player's season-long bonus picks, with each correct one highlighted once the
 * tournament answers are filled in. Renders nothing if the player has no picks
 * or they aren't readable yet (another player's picks before the bonus lock).
 */
export function PlayerBonusPicks({ uid, bonusPts }: { uid: string; bonusPts: number }) {
  const t = useT()
  const pick = useBonusPick(uid)
  const answers = useBonusAnswers()

  if (!pick) return null
  const hasAnswers = BONUS_KEYS.some((key) => !!answers[key])

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t('player.bonusPicks')}</h2>
        {bonusPts > 0 && (
          <span className="text-sm font-bold text-brand-500 tabular-nums shrink-0">
            +{bonusPts} {t('points.pts')}
          </span>
        )}
      </div>
      <div className="divide-y divide-slate-800">
        {BONUS_KEYS.map((key) => {
          const raw = pick[key]
          if (!raw) return null
          const value = FIELD_META[key].kind === 'team' ? t.team(raw) : raw
          const ok = hasAnswers && isCorrect(key, pick, answers)
          return (
            <div key={key} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-slate-400 text-xs uppercase tracking-wide">
                {t(`bonus.${key}Label`)}
              </span>
              <span
                className={`text-right font-medium ${ok ? 'text-emerald-300 font-semibold' : 'text-slate-200'}`}
              >
                {FIELD_META[key].emoji} {value}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
