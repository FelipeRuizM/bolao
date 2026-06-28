import { useMemo, useState } from 'react'
import { useMatchPredictions } from '@/hooks/useMatchPredictions'
import { useUsers, displayNameFor } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n'
import { computePoints } from '@/scoring'
import { setUserPrediction } from '@/api/admin'
import { TierBadge } from './TierBadge'
import type { Match, Prediction } from '@/types'

interface Row {
  uid: string
  name: string
  prediction?: Prediction
  points?: { total: number; tier: import('@/scoring').Tier }
}

export function EveryonesPicks({ match }: { match: Match }) {
  const { predictions, error } = useMatchPredictions(match.id, match.kickoffAt)
  const users = useUsers()
  const { user, isAdmin } = useAuth()
  const t = useT()
  const [editingUid, setEditingUid] = useState<string | null>(null)

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = Object.keys(users).map((uid) => {
      const profile = users[uid]
      const pred = predictions?.[uid]
      let points: Row['points']
      // Score finished matches, and live ones too — against the current score, so
      // everyone can see what their pick is worth if the match ended right now.
      if (pred && match.score && (match.status === 'FT' || match.status === 'LIVE')) {
        const r = computePoints({
          prediction: { home: pred.home, away: pred.away },
          actual: match.score,
          stage: match.stage,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
        })
        points = { total: r.total, tier: r.tier }
      }
      return { uid, name: displayNameFor(uid, profile), prediction: pred, points }
    })
    // Sort by the left (home) team's predicted score first, then the right
    // (away) team's score — both highest first. Users with no pick sink to the
    // bottom. Tiebreak by name.
    list.sort((a, b) => {
      const aHasPick = a.prediction ? 0 : 1
      const bHasPick = b.prediction ? 0 : 1
      if (aHasPick !== bHasPick) return aHasPick - bHasPick
      if (a.prediction && b.prediction) {
        if (a.prediction.home !== b.prediction.home) return b.prediction.home - a.prediction.home
        if (a.prediction.away !== b.prediction.away) return b.prediction.away - a.prediction.away
      }
      return a.name.localeCompare(b.name)
    })
    return list
  }, [users, predictions, match])

  // The hook only returns data once kickoff has passed (when picks lock and the
  // rules permit the read), so a null result means "not revealed yet" — render
  // nothing until then, regardless of whether the live-score sync has flipped
  // the match to LIVE.
  if (predictions === null && !error) return null

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{t('matchDetail.everyonesPicks')}</h2>
        {match.status === 'LIVE' && (
          <span className="text-[11px] text-red-400 uppercase tracking-wider">
            {t('matchDetail.matchInProgress')}
          </span>
        )}
      </div>

      {match.status === 'LIVE' && match.score && (
        <p className="text-xs text-slate-500">{t('matchDetail.livePicksHint')}</p>
      )}

      {error && <p className="text-sm text-red-400 break-words">{error}</p>}
      {predictions !== null && rows.length === 0 && (
        <p className="text-sm text-slate-400">{t('matchDetail.noPicksFromAnyone')}</p>
      )}

      <ul className="divide-y divide-slate-800">
        {rows.map((row) =>
          editingUid === row.uid ? (
            <AdminPickEditor
              key={row.uid}
              matchId={match.id}
              uid={row.uid}
              name={row.name}
              prediction={row.prediction}
              onClose={() => setEditingUid(null)}
            />
          ) : (
            <li
              key={row.uid}
              className={`py-2.5 flex items-center gap-3 ${
                row.uid === user?.uid ? 'bg-slate-800/30 -mx-4 px-4' : ''
              }`}
            >
              <span className="flex-1 truncate font-medium text-sm">{row.name}</span>
              {row.prediction ? (
                <span className="font-bold tabular-nums text-base">
                  {row.prediction.home}–{row.prediction.away}
                </span>
              ) : (
                <span className="text-xs text-slate-500 italic">{t('matchDetail.noPickFromUser')}</span>
              )}
              {row.points && <TierBadge tier={row.points.tier} points={row.points.total} />}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setEditingUid(row.uid)}
                  className="shrink-0 text-xs font-semibold text-amber-300 hover:text-amber-200 border border-amber-500/40 rounded px-2 py-1"
                >
                  {t('admin.editPick')}
                </button>
              )}
            </li>
          ),
        )}
      </ul>
    </section>
  )
}

/**
 * Inline editor for an admin to repair a single player's pick (e.g. one that
 * never registered). Writes directly via {@link setUserPrediction}, bypassing
 * the kickoff lock, then recomputes the leaderboard.
 */
function AdminPickEditor({
  matchId,
  uid,
  name,
  prediction,
  onClose,
}: {
  matchId: string
  uid: string
  name: string
  prediction?: Prediction
  onClose: () => void
}) {
  const t = useT()
  const [home, setHome] = useState(prediction?.home ?? 0)
  const [away, setAway] = useState(prediction?.away ?? 0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      await setUserPrediction(matchId, uid, home, away)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="py-2.5 -mx-4 px-4 bg-amber-500/5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate font-medium text-sm">{name}</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={30}
          value={home}
          onChange={(e) => setHome(Math.max(0, Number(e.target.value) || 0))}
          aria-label={t('admin.editPickHome')}
          className="w-14 rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-base text-center tabular-nums focus:outline-none focus:border-brand-500"
        />
        <span className="text-slate-500">–</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={30}
          value={away}
          onChange={(e) => setAway(Math.max(0, Number(e.target.value) || 0))}
          aria-label={t('admin.editPickAway')}
          className="w-14 rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-base text-center tabular-nums focus:outline-none focus:border-brand-500"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        {err && <span className="flex-1 text-xs text-red-400 break-words">{err}</span>}
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 px-2 py-1 disabled:opacity-50"
        >
          {t('admin.editPickCancel')}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="text-xs font-semibold text-slate-950 bg-brand-500 hover:bg-brand-600 rounded px-3 py-1.5 disabled:opacity-50"
        >
          {busy ? t('admin.saving') : t('admin.editPickSave')}
        </button>
      </div>
    </li>
  )
}
