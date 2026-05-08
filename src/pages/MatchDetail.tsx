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
            alt={match.homeTeam} 
            className="w-14 h-14 sm:w-20 sm:h-20 object-contain drop-shadow-xl"
            onError={(e) => { e.currentTarget.src = getTeamEmblemUrl('fallback') }}
          />
          <span className="truncate text-slate-100">{match.homeTeam}</span>
        </div>
        <span className="text-slate-600 text-xl sm:text-3xl font-semibold bg-slate-800/50 px-4 py-2 rounded-xl">{t('matchCard.vs')}</span>
        <div className="flex items-center gap-3">
          <span className="truncate text-slate-100">{match.awayTeam}</span>
          <img 
            src={getTeamEmblemUrl(match.awayTeam)} 
            alt={match.awayTeam} 
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
    <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-10 space-y-8">
      <MatchHeader match={match} />

      {!isLocked && (
        <form
          onSubmit={onSave}
          className="space-y-6"
        >
          <div className="border-b border-slate-800/50 pb-4 mb-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{t('matchDetail.yourPrediction')}</h2>
            <p className="text-sm text-slate-400 mt-1.5">{t('matchDetail.locksAtKickoff')}</p>
          </div>
          
          <div className="relative overflow-hidden bg-slate-900 border border-slate-800/80 rounded-3xl p-6 sm:p-12 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-8 sm:gap-12">
            {/* Faded background logos */}
            <div className="absolute top-0 left-0 w-full sm:w-1/2 h-full opacity-[0.03] sm:opacity-5 pointer-events-none flex items-center justify-center sm:-translate-x-1/4 scale-150">
              <img src={getTeamEmblemUrl(match.homeTeam)} className="w-full h-full object-contain" />
            </div>
            <div className="absolute top-0 right-0 w-full sm:w-1/2 h-full opacity-[0.03] sm:opacity-5 pointer-events-none flex items-center justify-center sm:translate-x-1/4 scale-150">
              <img src={getTeamEmblemUrl(match.awayTeam)} className="w-full h-full object-contain" />
            </div>

            <div className="relative z-10 flex-1 flex flex-col items-center gap-6 w-full">
              <h3 className="text-2xl sm:text-4xl font-extrabold text-white text-center drop-shadow-md">{match.homeTeam}</h3>
              <ScoreStepper value={home} onChange={setHome} disabled={busy} label={match.homeTeam} />
            </div>

            <div className="relative z-10 flex-none text-2xl sm:text-4xl font-black text-slate-600 bg-slate-800/80 px-6 py-3 rounded-2xl shadow-inner my-2 sm:my-0">
              {t('matchCard.vs')}
            </div>

            <div className="relative z-10 flex-1 flex flex-col items-center gap-6 w-full">
              <h3 className="text-2xl sm:text-4xl font-extrabold text-white text-center drop-shadow-md">{match.awayTeam}</h3>
              <ScoreStepper value={away} onChange={setAway} disabled={busy} label={match.awayTeam} />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-4 py-5 font-bold text-xl min-h-14 transition-all hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:-translate-y-0.5 active:translate-y-0 text-slate-950 mt-4"
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
