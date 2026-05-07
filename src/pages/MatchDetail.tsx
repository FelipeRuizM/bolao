import { useEffect, useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMatch } from '@/hooks/useMatches'
import { useMyPrediction } from '@/hooks/usePrediction'
import { useAuth } from '@/hooks/useAuth'
import { submitPrediction } from '@/api/predictions'
import { ScoreStepper } from '@/components/ScoreStepper'
import type { Match, Stage } from '@/types'

const STAGE_LABEL: Record<Stage, string> = {
  group: 'Group stage',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-final',
  sf: 'Semi-final',
  '3rd': '3rd-place playoff',
  final: 'Final',
}

function formatKickoff(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MatchHeader({ match }: { match: Match }) {
  const isBrazil = match.homeTeam === 'Brazil' || match.awayTeam === 'Brazil'
  const stageLabel = match.group ? `${STAGE_LABEL[match.stage]} · ${match.group}` : STAGE_LABEL[match.stage]
  return (
    <header className="space-y-3">
      <Link to="/matches" className="text-xs text-brand-500">← All matches</Link>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>{stageLabel}</span>
        {isBrazil && (
          <span className="text-[10px] font-bold text-amber-400 border border-amber-500/40 bg-amber-500/10 rounded px-1.5">
            3× multiplier
          </span>
        )}
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold">
        {match.homeTeam} <span className="text-slate-500 text-xl">vs</span> {match.awayTeam}
      </h1>
      <p className="text-sm text-slate-400">{formatKickoff(match.kickoffAt)}</p>
    </header>
  )
}

export function MatchDetail() {
  const { id } = useParams<{ id: string }>()
  const match = useMatch(id)
  const { user } = useAuth()
  const myPrediction = useMyPrediction(id, user?.uid)
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
    return <div className="p-6 text-slate-400">Loading…</div>
  }
  if (match === null) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-3">
        <p className="text-slate-400">Match not found.</p>
        <Link to="/matches" className="text-brand-500 underline">Back to matches</Link>
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
        <form onSubmit={onSave} className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div>
            <h2 className="font-semibold">Your prediction</h2>
            <p className="text-xs text-slate-400 mt-1">
              Locks at kickoff. You can edit until then.
            </p>
          </div>
          <ScoreStepper label={match.homeTeam} value={home} onChange={setHome} disabled={busy} />
          <ScoreStepper label={match.awayTeam} value={away} onChange={setAway} disabled={busy} />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 px-4 py-4 font-semibold text-lg min-h-12"
          >
            {busy ? 'Saving…' : hasPrediction ? 'Update pick' : 'Save pick'}
          </button>
          {savedFlash && (
            <p className="text-sm text-emerald-400 text-center">Saved ✓</p>
          )}
          {error && <p className="text-sm text-red-400 break-words">{error}</p>}
          {hasPrediction && myPrediction?.submittedAt && (
            <p className="text-xs text-slate-500 text-center">
              Last saved {new Date(myPrediction.submittedAt).toLocaleString()}
            </p>
          )}
        </form>
      )}

      {isLocked && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="font-semibold">Predictions locked</h2>
          {hasPrediction ? (
            <div>
              <p className="text-sm text-slate-400 mb-2">Your pick:</p>
              <div className="flex items-center justify-center gap-4 text-3xl font-bold tabular-nums">
                <span>{myPrediction!.home}</span>
                <span className="text-slate-500">–</span>
                <span>{myPrediction!.away}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">You didn't submit a pick for this match.</p>
          )}
          <p className="text-xs text-slate-500 italic">
            Other players' picks will be visible here in a later update.
          </p>
        </section>
      )}
    </div>
  )
}
