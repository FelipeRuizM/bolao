import { useMemo } from 'react'
import { useMatchPickStatus } from '@/hooks/useMatchPredictions'
import { useUsers, displayNameFor } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n'

/**
 * Pre-kickoff roster: shows which players have already locked in a pick for a
 * match, WITHOUT revealing the scores. Use this before a match starts; after
 * kickoff use <EveryonesPicks> instead, which shows the actual predictions.
 */
export function PickStatusList({ matchId }: { matchId: string }) {
  const t = useT()
  const users = useUsers()
  const status = useMatchPickStatus(matchId)
  const { user } = useAuth()

  const rows = useMemo(() => {
    return Object.keys(users)
      .map((uid) => ({
        uid,
        name: displayNameFor(uid, users[uid]),
        picked: !!status?.[uid],
      }))
      .sort((a, b) => {
        if (a.picked !== b.picked) return a.picked ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }, [users, status])

  // Read unavailable (rule not deployed, or still loading) — hide rather than mislead.
  if (status === null || rows.length === 0) return null

  const pickedCount = rows.filter((r) => r.picked).length

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{t('matchDetail.whoPickedTitle')}</h2>
        <span className="text-xs text-slate-400 tabular-nums">
          {t('matchDetail.whoPickedCount', { n: pickedCount, total: rows.length })}
        </span>
      </div>
      <p className="text-xs text-slate-500">{t('matchDetail.whoPickedHint')}</p>
      <ul className="divide-y divide-slate-800">
        {rows.map((r) => (
          <li
            key={r.uid}
            className={`py-2.5 flex items-center justify-between gap-3 ${
              r.uid === user?.uid ? 'bg-slate-800/30 -mx-4 px-4' : ''
            }`}
          >
            <span className="flex-1 truncate text-sm font-medium">{r.name}</span>
            {r.picked ? (
              <span className="shrink-0 text-xs font-semibold text-emerald-400">
                ✓ {t('matchDetail.picked')}
              </span>
            ) : (
              <span className="shrink-0 text-xs text-slate-500 italic">
                {t('matchDetail.notPickedYet')}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
