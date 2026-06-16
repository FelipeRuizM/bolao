import { useState } from 'react'
import { overrideMatchResult } from '@/api/admin'
import { useT } from '@/i18n'
import { AdminButton, StatusLine } from './AdminCard'
import type { Match, MatchStatus } from '@/types'

const STATUSES: MatchStatus[] = ['SCHEDULED', 'LIVE', 'FT']

/**
 * Manual status/score override for a single match. Shared by the Admin page's
 * search-driven ScoreOverrideSection and the per-match detail screen. Pass
 * `onClose` to render a dismiss (✕) affordance (used when picked from a list);
 * omit it when the form is anchored to one match.
 */
export function MatchOverrideForm({ match, onClose }: { match: Match; onClose?: () => void }) {
  const t = useT()
  const [home, setHome] = useState(match.score?.home ?? 0)
  const [away, setAway] = useState(match.score?.away ?? 0)
  const [status, setStatus] = useState<MatchStatus>(match.status)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setOk(null)
    setErr(null)
    try {
      const score = status === 'SCHEDULED' ? null : { home, away }
      await overrideMatchResult(match.id, score, status)
      setOk(t('admin.overrideOk'))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-slate-800/60 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm">
          {t.team(match.homeTeam)} vs {t.team(match.awayTeam)}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">{t.team(match.homeTeam)}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            value={home}
            onChange={(e) => setHome(Number(e.target.value) || 0)}
            disabled={status === 'SCHEDULED'}
            className="rounded bg-slate-900 border border-slate-700 px-3 py-2 text-base text-center tabular-nums focus:outline-none focus:border-brand-500 disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">{t.team(match.awayTeam)}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            value={away}
            onChange={(e) => setAway(Number(e.target.value) || 0)}
            disabled={status === 'SCHEDULED'}
            className="rounded bg-slate-900 border border-slate-700 px-3 py-2 text-base text-center tabular-nums focus:outline-none focus:border-brand-500 disabled:opacity-50"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">{t('admin.statusLabel')}</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MatchStatus)}
          className="rounded bg-slate-900 border border-slate-700 px-3 py-2 text-base focus:outline-none focus:border-brand-500"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <AdminButton
        label={t('admin.saveOverride')}
        busyLabel={t('admin.saving')}
        busy={busy}
        onClick={save}
      />
      <StatusLine ok={ok} err={err} />
    </div>
  )
}
