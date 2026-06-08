import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { get, onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import { useMatches } from '@/hooks/useMatches'
import { useUsers, displayNameFor } from '@/hooks/useUsers'
import { useT } from '@/i18n'
import { classifyTier } from '@/scoring'
import { TierBadge } from '@/components/TierBadge'
import type { Match, Prediction, UserScore } from '@/types'

const MAX_ENTRIES = 20

interface Entry {
  key: string
  uid: string
  name: string
  match: Match
  points: number
}

/**
 * Inline activity feed under the leaderboard: the most recently awarded points
 * first. Each row is one player's score on one finished match. Awarded points
 * come from /scores/{uid}/perMatch; we order by match kickoff (the best proxy
 * for "when points landed", since results aren't individually timestamped) and
 * label each award with its tier by fetching predictions for just the matches
 * in the visible window.
 */
export function PointsFeed() {
  const t = useT()
  const { matches } = useMatches()
  const users = useUsers()
  const [scores, setScores] = useState<Record<string, UserScore> | null>(null)
  const [preds, setPreds] = useState<Record<string, Record<string, Prediction>>>({})

  useEffect(() => {
    return onValue(ref(db, 'scores'), (snap) => {
      setScores((snap.val() as Record<string, UserScore> | null) ?? {})
    })
  }, [])

  const entries = useMemo<Entry[]>(() => {
    if (!matches || !scores) return []
    const byId = new Map(matches.map((m) => [m.id, m]))
    const list: Entry[] = []
    for (const [uid, score] of Object.entries(scores)) {
      // users is pre-filtered to the current group; skip anyone outside it so
      // other-group players don't leak in via their uid prefix.
      if (!users[uid]) continue
      const perMatch = score?.perMatch
      if (!perMatch) continue
      for (const [matchId, pts] of Object.entries(perMatch)) {
        if (!(pts > 0)) continue
        const match = byId.get(matchId)
        if (!match || match.status !== 'FT' || !match.score) continue
        list.push({ key: `${matchId}:${uid}`, uid, name: displayNameFor(uid, users[uid]), match, points: pts })
      }
    }
    list.sort((a, b) => {
      if (b.match.kickoffAt !== a.match.kickoffAt) return b.match.kickoffAt - a.match.kickoffAt
      if (b.points !== a.points) return b.points - a.points
      return a.name.localeCompare(b.name)
    })
    return list.slice(0, MAX_ENTRIES)
  }, [matches, scores, users])

  // Distinct matches in the visible window — fetch their predictions to derive tiers.
  const windowKey = useMemo(
    () => Array.from(new Set(entries.map((e) => e.match.id))).sort().join(','),
    [entries],
  )

  useEffect(() => {
    const ids = windowKey ? windowKey.split(',') : []
    if (ids.length === 0) return
    let cancelled = false
    Promise.all(
      ids.map(async (id): Promise<[string, Record<string, Prediction>]> => {
        try {
          const snap = await get(ref(db, `predictions/${id}`))
          return [id, (snap.val() as Record<string, Prediction> | null) ?? {}]
        } catch {
          return [id, {}]
        }
      }),
    ).then((pairs) => {
      if (!cancelled) setPreds(Object.fromEntries(pairs))
    })
    return () => {
      cancelled = true
    }
  }, [windowKey])

  if (entries.length === 0) return null

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-slate-300 px-1">{t('home.feedTitle')}</h2>
      <ul className="divide-y divide-slate-800 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        {entries.map((e) => {
          const pred = preds[e.match.id]?.[e.uid]
          const tier = pred ? classifyTier({ home: pred.home, away: pred.away }, e.match.score!) : undefined
          return (
            <li key={e.key}>
              <Link
                to={`/players/${e.uid}`}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{e.name}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {t.team(e.match.homeTeam)} {e.match.score!.home}–{e.match.score!.away} {t.team(e.match.awayTeam)}
                  </div>
                </div>
                {tier ? (
                  <TierBadge tier={tier} points={e.points} />
                ) : (
                  <span className="shrink-0 text-sm font-bold text-brand-500 tabular-nums">
                    +{e.points}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
