import { useEffect, useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMatch } from '@/hooks/useMatches'
import { useMyPrediction } from '@/hooks/usePrediction'
import { useAuth } from '@/hooks/useAuth'
import { useSync } from '@/hooks/useSync'
import { submitPrediction } from '@/api/predictions'
import { ScoreStepper } from '@/components/ScoreStepper'
import { EveryonesPicks } from '@/components/EveryonesPicks'
import { useT, useLocale, bcp47 } from '@/i18n'
import { multiplierFor } from '@/scoring'
import type { Match, Stage } from '@/types'

const STAGE_KEY: Record<Stage, string> = {
  group: 'stages.group',
  r32: 'stages.r32',
  r16: 'stages.r16',
  qf: 'stages.qf',
  sf: 'stages.sf',
  '3rd': 'stages.third',
  final: 'stages.final',
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

function MatchHeader({ match }: { match: Match }) {
  const t = useT()
  const { locale } = useLocale()
  const stageLabel = match.group ? `${t(STAGE_KEY[match.stage])} · ${match.group}` : t(STAGE_KEY[match.stage])
  const mult = multiplierFor(match.stage, match.homeTeam, match.awayTeam)
  return (
    <header className="space-y-3">
      <Link to="/matches" className="text-xs text-brand-500">
        {t('matchDetail.backToMatches')}
      </Link>
      <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
        <span>{stageLabel}</span>
        {mult > 1 && (
          <span className="text-[10px] font-bold text-amber-400 border border-amber-500/40 bg-amber-500/10 rounded px-1.5">
            {t('matchDetail.multiplierBadge', { n: mult })}
          </span>
        )}
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold">
        {match.homeTeam} <span className="text-slate-500 text-xl">{t('matchCard.vs')}</span>{' '}
        {match.awayTeam}
      </h1>
      <p className="text-sm text-slate-400">{formatKickoff(match.kickoffAt, bcp47(locale))}</p>
    </header>
  )
}

export function MatchDetail() {
  const { id } = useParams<{ id: string }>()
  const match = useMatch(id)
  const { user } = useAuth()
  const myPrediction = useMyPrediction(id, user?.uid)
  const t = useT()
  const { locale } = useLocale()
  useSync()
  const [home, setHome] = useState(0)
  const [away, setAway] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (myPrediction) {
      setHome(myPrediction.home)
      setAway(myPrediction.away)
    }
  }, [myPrediction])

  if (match === undefined) {
    return <div className="p-6 text-slate-400">{t('matchDetail.loading')}</div>
  }
  if (match === null) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-3">
        <p className="text-slate-400">{t('matchDetail.notFound')}</p>
        <Link to="/matches" className="text-brand-500 underline">
          {t('matchDetail.backLink')}
        </Link>
      </div>
    )
  }

  const isLocked = Date.now() >= match.kickoffAt
  const hasPrediction = !!myPrediction

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!user || !id || !match) return
    setBusy(true)
    setError(null)
    try {
      await submitPrediction(id, user.uid, home, away, match.kickoffAt)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-6">
      <MatchHeader match={match} />

      {!isLocked && (
        <form
          onSubmit={onSave}
          className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-4"
        >
          <div>
            <h2 className="font-semibold">{t('matchDetail.yourPrediction')}</h2>
            <p className="text-xs text-slate-400 mt-1">{t('matchDetail.locksAtKickoff')}</p>
          </div>
          <ScoreStepper label={match.homeTeam} value={home} onChange={setHome} disabled={busy} />
          <ScoreStepper label={match.awayTeam} value={away} onChange={setAway} disabled={busy} />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 px-4 py-4 font-semibold text-lg min-h-12"
          >
            {busy
              ? t('matchDetail.saving')
              : hasPrediction
              ? t('matchDetail.updatePick')
              : t('matchDetail.savePick')}
          </button>
          {savedFlash && <p className="text-sm text-emerald-400 text-center">{t('matchDetail.saved')}</p>}
          {error && <p className="text-sm text-red-400 break-words">{error}</p>}
          {hasPrediction && myPrediction?.submittedAt && (
            <p className="text-xs text-slate-500 text-center">
              {t('matchDetail.lastSaved', {
                when: new Date(myPrediction.submittedAt).toLocaleString(bcp47(locale)),
              })}
            </p>
          )}
        </form>
      )}

      {isLocked && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="font-semibold">{t('matchDetail.locked')}</h2>
          {match.score && (
            <div>
              <p className="text-sm text-slate-400 mb-2">{t('matchDetail.actualResult')}</p>
              <div className="flex items-center justify-center gap-4 text-3xl font-bold tabular-nums">
                <span>{match.score.home}</span>
                <span className="text-slate-500">–</span>
                <span>{match.score.away}</span>
              </div>
            </div>
          )}
          {hasPrediction ? (
            <div>
              <p className="text-sm text-slate-400 mb-2">{t('matchDetail.yourPick')}</p>
              <div className="flex items-center justify-center gap-4 text-2xl font-bold tabular-nums text-brand-500">
                <span>{myPrediction!.home}</span>
                <span className="text-slate-500">–</span>
                <span>{myPrediction!.away}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t('matchDetail.noPickSubmitted')}</p>
          )}
        </section>
      )}

      {isLocked && <EveryonesPicks match={match} />}
    </div>
  )
}
