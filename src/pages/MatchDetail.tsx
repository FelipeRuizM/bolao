import { useEffect, useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMatch } from '@/hooks/useMatches'
import { useMyPrediction } from '@/hooks/usePrediction'
import { useAuth } from '@/hooks/useAuth'
import { useSync } from '@/hooks/useSync'
import { isPredictionOpen, predictionOpensAt, submitPrediction } from '@/api/predictions'
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

import { getTeamEmblemUrl } from '@/utils/emblems'

function MatchHeader({ match }: { match: Match }) {
  const t = useT()
  const { locale } = useLocale()
  const stageLabel = match.group ? `${t(STAGE_KEY[match.stage])} · ${match.group}` : t(STAGE_KEY[match.stage])
  const mult = multiplierFor(match.stage, match.homeTeam, match.awayTeam)
  return (
    <header className="space-y-4">
      <Link to="/matches" className="text-xs text-brand-500 hover:text-brand-400 transition-colors font-medium">
        ← {t('matchDetail.backToMatches')}
      </Link>
      <div className="flex items-center gap-2 text-xs font-medium text-slate-400 flex-wrap">
        <span>{stageLabel}</span>
        {mult > 1 && (
          <span className="text-[10px] font-bold text-brand-400 border border-brand-500/30 bg-brand-500/10 rounded px-1.5 shadow-[0_0_8px_rgba(234,179,8,0.2)]">
            {t('matchDetail.multiplierBadge', { n: mult })}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-2xl sm:text-4xl font-bold tracking-tight">
        <div className="flex items-center gap-3">
          <img
            src={getTeamEmblemUrl(match.homeTeam)}
            alt={t.team(match.homeTeam)}
            className="w-14 h-14 sm:w-20 sm:h-20 object-contain drop-shadow-xl"
            onError={(e) => { e.currentTarget.src = getTeamEmblemUrl('fallback') }}
          />
          <span className="truncate text-slate-100">{t.team(match.homeTeam)}</span>
        </div>
        <span className="text-slate-600 text-xl sm:text-3xl font-semibold bg-slate-800/50 px-4 py-2 rounded-xl">{t('matchCard.vs')}</span>
        <div className="flex items-center gap-3">
          <span className="truncate text-slate-100">{t.team(match.awayTeam)}</span>
          <img
            src={getTeamEmblemUrl(match.awayTeam)}
            alt={t.team(match.awayTeam)}
            className="w-14 h-14 sm:w-20 sm:h-20 object-contain drop-shadow-xl"
            onError={(e) => { e.currentTarget.src = getTeamEmblemUrl('fallback') }}
          />
        </div>
      </div>
      <p className="text-sm font-medium text-slate-400 bg-slate-800/30 inline-block px-3 py-1.5 rounded-md border border-slate-700/50">
        {formatKickoff(match.kickoffAt, bcp47(locale))}
      </p>
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
      <div className="max-w-3xl mx-auto p-6 text-center space-y-3">
        <p className="text-slate-400">{t('matchDetail.notFound')}</p>
        <Link to="/matches" className="text-brand-500 underline">
          {t('matchDetail.backLink')}
        </Link>
      </div>
    )
  }

  const isLocked = Date.now() >= match.kickoffAt
  const predictionsOpen = isPredictionOpen(match.kickoffAt)
  const opensAt = predictionOpensAt(match.kickoffAt)
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

  if (!isLocked && !predictionsOpen) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-10 space-y-8">
        <MatchHeader match={match} />
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
          <h2 className="font-semibold text-slate-200">{t('matchDetail.predictionsNotOpenHeading')}</h2>
          <p className="text-sm text-slate-400">
            {t('matchDetail.predictionsOpenAt', { when: formatKickoff(opensAt, bcp47(locale)) })}
          </p>
        </section>
      </div>
    )
  }

  if (!isLocked) {
    const stageLabel = match.group ? `${t(STAGE_KEY[match.stage])} · ${match.group}` : t(STAGE_KEY[match.stage])
    const mult = multiplierFor(match.stage, match.homeTeam, match.awayTeam)
    return (
      <form
        onSubmit={onSave}
        className="flex flex-col min-h-[calc(100dvh-3.5rem)] sm:min-h-[calc(100dvh-4rem)]"
      >
        {/* Compact top bar — back link, stage, multiplier */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-3 text-xs sm:text-sm flex-wrap">
          <Link to="/matches" className="text-brand-500 hover:text-brand-400 font-medium">
            ← {t('matchDetail.backToMatches')}
          </Link>
          <span className="text-slate-400 font-medium">{stageLabel}</span>
          {mult > 1 && (
            <span className="text-[10px] font-bold text-brand-400 border border-brand-500/30 bg-brand-500/10 rounded px-1.5 shadow-[0_0_8px_rgba(234,179,8,0.2)]">
              {t('matchDetail.multiplierBadge', { n: mult })}
            </span>
          )}
        </div>

        {/* Full-bleed prediction area — fills remaining height */}
        <div className="relative flex-1 overflow-hidden flex items-center justify-center px-2 sm:px-6 py-4 sm:py-8">
          {/* Oversized emblems pinned to the edges, cropped by overflow-hidden */}
          <img
            src={getTeamEmblemUrl(match.homeTeam)}
            alt=""
            onError={(e) => { e.currentTarget.src = getTeamEmblemUrl('fallback') }}
            className="absolute -left-32 sm:-left-56 top-1/2 -translate-y-1/2 w-72 h-auto sm:w-[36rem] object-contain pointer-events-none select-none opacity-50"
          />
          <img
            src={getTeamEmblemUrl(match.awayTeam)}
            alt=""
            onError={(e) => { e.currentTarget.src = getTeamEmblemUrl('fallback') }}
            className="absolute -right-32 sm:-right-56 top-1/2 -translate-y-1/2 w-72 h-auto sm:w-[36rem] object-contain pointer-events-none select-none opacity-50"
          />

          <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-10 w-full">
            <p className="text-xs sm:text-base font-bold text-slate-200 tracking-wide">
              {formatKickoff(match.kickoffAt, bcp47(locale))}
            </p>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 sm:gap-x-10 gap-y-5 sm:gap-y-7 w-full max-w-lg">
              <div className="flex justify-center">
                <ScoreStepper value={home} onChange={setHome} disabled={busy} label={t.team(match.homeTeam)} />
              </div>
              <span className="text-4xl sm:text-6xl font-bold text-slate-400 select-none px-1">
                x
              </span>
              <div className="flex justify-center">
                <ScoreStepper value={away} onChange={setAway} disabled={busy} label={t.team(match.awayTeam)} />
              </div>

              <h3 className="text-center text-lg sm:text-2xl font-bold text-slate-100 truncate px-1">
                {t.team(match.homeTeam)}
              </h3>
              <span aria-hidden="true" />
              <h3 className="text-center text-lg sm:text-2xl font-bold text-slate-100 truncate px-1">
                {t.team(match.awayTeam)}
              </h3>
            </div>

            <div className="w-full max-w-lg space-y-2">
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-4 py-4 font-bold text-lg min-h-12 transition-all hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:-translate-y-0.5 active:translate-y-0 text-slate-950"
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
            </div>
          </div>
        </div>
      </form>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-10 space-y-8">
      <MatchHeader match={match} />

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

      <EveryonesPicks match={match} />
    </div>
  )
}
