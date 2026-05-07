import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMatches } from '@/hooks/useMatches'
import { useUsers, displayNameFor } from '@/hooks/useUsers'
import {
  useAllBonusPicks,
  useBonusAnswers,
  useBonusLockAt,
  useMyBonusPick,
} from '@/hooks/useBonus'
import { submitBonusPicks } from '@/api/bonus'
import { useT, useLocale, bcp47 } from '@/i18n'
import {
  DEFAULT_BONUS_VALUES,
  computeBonusPoints,
  normalizeBonusAnswer,
} from '@/scoring'

function formatDateTime(ms: number, locale: string): string {
  return new Date(ms).toLocaleString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Bonus() {
  const { user } = useAuth()
  const t = useT()
  const { locale } = useLocale()
  const lockAt = useBonusLockAt()
  const myPick = useMyBonusPick(user?.uid)
  const { matches } = useMatches()
  const isLocked = lockAt != null && Date.now() >= lockAt
  const { picks: allPicks, error: allPicksError } = useAllBonusPicks(isLocked)
  const users = useUsers()
  const answers = useBonusAnswers()

  const [winner, setWinner] = useState('')
  const [topScorer, setTopScorer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (myPick) {
      setWinner(myPick.tournamentWinner ?? '')
      setTopScorer(myPick.topScorer ?? '')
    }
  }, [myPick])

  const teams = useMemo(() => {
    if (!matches) return []
    const set = new Set<string>()
    for (const m of matches) {
      if (m.group) {
        set.add(m.homeTeam)
        set.add(m.awayTeam)
      }
    }
    return Array.from(set).sort()
  }, [matches])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      await submitBonusPicks(user.uid, winner, topScorer, lockAt ?? null)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (lockAt === undefined) {
    return <div className="p-6 text-slate-400">{t('matchDetail.loading')}</div>
  }

  const winnerPts = DEFAULT_BONUS_VALUES.tournamentWinner
  const scorerPts = DEFAULT_BONUS_VALUES.topScorer
  const hasAnswers = !!answers.tournamentWinner || !!answers.topScorer

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-5">
      <header className="space-y-2 px-1">
        <h1 className="text-2xl font-bold">{t('bonus.title')}</h1>
        <p className="text-sm text-slate-400">{t('bonus.intro')}</p>
        {lockAt === null ? (
          <p className="text-xs text-amber-300">{t('bonus.notInitialized')}</p>
        ) : (
          <p className="text-xs text-slate-400">
            {isLocked
              ? t('bonus.lockedSince', { when: formatDateTime(lockAt, bcp47(locale)) })
              : t('bonus.locksAt', { when: formatDateTime(lockAt, bcp47(locale)) })}
          </p>
        )}
      </header>

      {!isLocked && lockAt !== null && (
        <form onSubmit={onSave} className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <label className="block">
            <span className="text-sm font-semibold">
              {t('bonus.tournamentWinnerLabel')}
            </span>
            <span className="block text-xs text-slate-400 mt-0.5">
              {t('bonus.tournamentWinnerHelp', { n: winnerPts })}
            </span>
            <select
              value={winner}
              onChange={(e) => setWinner(e.target.value)}
              required
              className="mt-2 w-full rounded bg-slate-800 border border-slate-700 px-3 py-3 text-base focus:outline-none focus:border-brand-500"
            >
              <option value="">{t('bonus.tournamentWinnerPlaceholder')}</option>
              {teams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold">{t('bonus.topScorerLabel')}</span>
            <span className="block text-xs text-slate-400 mt-0.5">
              {t('bonus.topScorerHelp', { n: scorerPts })}
            </span>
            <input
              type="text"
              value={topScorer}
              onChange={(e) => setTopScorer(e.target.value)}
              required
              maxLength={80}
              placeholder={t('bonus.topScorerPlaceholder')}
              className="mt-2 w-full rounded bg-slate-800 border border-slate-700 px-3 py-3 text-base focus:outline-none focus:border-brand-500"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 px-4 py-4 font-semibold text-lg min-h-12"
          >
            {busy ? t('bonus.saving') : t('bonus.save')}
          </button>
          {savedFlash && <p className="text-sm text-emerald-400 text-center">{t('bonus.saved')}</p>}
          {error && <p className="text-sm text-red-400 break-words">{error}</p>}
        </form>
      )}

      {isLocked && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <h2 className="font-semibold">{t('bonus.yourPicks')}</h2>
          <Row label={t('bonus.tournamentWinnerLabel')} value={myPick?.tournamentWinner} />
          <Row label={t('bonus.topScorerLabel')} value={myPick?.topScorer} />
        </section>
      )}

      {isLocked && hasAnswers && (
        <section className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
          <h2 className="font-semibold text-emerald-300">{t('bonus.answersHeading')}</h2>
          {answers.tournamentWinner && (
            <Row label={t('bonus.answersWinner')} value={answers.tournamentWinner} bold />
          )}
          {answers.topScorer && <Row label={t('bonus.answersTopScorer')} value={answers.topScorer} bold />}
        </section>
      )}

      {isLocked && !hasAnswers && (
        <p className="text-xs text-slate-500 italic px-1">{t('bonus.awaitingAnswers')}</p>
      )}

      {isLocked && (
        <EveryonesBonus
          allPicks={allPicks}
          users={users}
          error={allPicksError}
          answers={answers}
          currentUid={user?.uid}
        />
      )}
    </div>
  )
}

function Row({ label, value, bold = false }: { label: string; value?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-400 text-xs uppercase tracking-wide">{label}</span>
      <span className={`text-right ${bold ? 'font-bold' : ''} ${value ? '' : 'text-slate-500 italic'}`}>
        {value || '—'}
      </span>
    </div>
  )
}

function EveryonesBonus({
  allPicks,
  users,
  error,
  answers,
  currentUid,
}: {
  allPicks: Record<string, import('@/types').BonusPick> | null
  users: Record<string, import('@/types').UserProfile>
  error: string | null
  answers: import('@/scoring').BonusAnswers
  currentUid: string | undefined
}) {
  const t = useT()
  const hasAnswers = !!answers.tournamentWinner || !!answers.topScorer

  const rows = useMemo(() => {
    return Object.keys(users).map((uid) => {
      const profile = users[uid]
      const pick = allPicks?.[uid]
      const winnerOk =
        hasAnswers &&
        !!pick?.tournamentWinner &&
        normalizeBonusAnswer(pick.tournamentWinner) === normalizeBonusAnswer(answers.tournamentWinner)
      const scorerOk =
        hasAnswers &&
        !!pick?.topScorer &&
        normalizeBonusAnswer(pick.topScorer) === normalizeBonusAnswer(answers.topScorer)
      const points = pick ? computeBonusPoints(pick, answers).total : 0
      return {
        uid,
        name: displayNameFor(uid, profile),
        pick,
        winnerOk,
        scorerOk,
        points,
      }
    }).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      const aHas = a.pick ? 0 : 1
      const bHas = b.pick ? 0 : 1
      if (aHas !== bHas) return aHas - bHas
      return a.name.localeCompare(b.name)
    })
  }, [users, allPicks, answers, hasAnswers])

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
      <h2 className="font-semibold">{t('bonus.everyonesPicks')}</h2>
      {error && <p className="text-sm text-red-400 break-words">{error}</p>}
      {allPicks !== null && rows.length === 0 && (
        <p className="text-sm text-slate-400">{t('bonus.noPicksFromAnyone')}</p>
      )}
      <ul className="divide-y divide-slate-800">
        {rows.map((row) => (
          <li
            key={row.uid}
            className={`py-2.5 space-y-1 ${row.uid === currentUid ? 'bg-slate-800/30 -mx-4 px-4' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm truncate">{row.name}</span>
              {hasAnswers && row.pick && (
                <span className="text-[11px] font-semibold text-brand-500 tabular-nums shrink-0">
                  {row.points} {t('points.pts')}
                </span>
              )}
            </div>
            {row.pick ? (
              <div className="flex items-center gap-3 text-xs">
                <span className={`flex-1 truncate ${row.winnerOk ? 'text-emerald-300 font-semibold' : 'text-slate-300'}`}>
                  🏆 {row.pick.tournamentWinner || '—'}
                </span>
                <span className={`flex-1 truncate ${row.scorerOk ? 'text-emerald-300 font-semibold' : 'text-slate-300'}`}>
                  ⚽ {row.pick.topScorer || '—'}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">{t('bonus.noBonusPick')}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
