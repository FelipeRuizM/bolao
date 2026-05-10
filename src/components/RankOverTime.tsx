import { useEffect, useMemo, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { db } from '@/firebase'
import { useT } from '@/i18n'
import type { Match, UserProfile } from '@/types'

const COLORS = [
  '#facc15', // amber-400 (brand)
  '#60a5fa', // blue-400
  '#34d399', // emerald-400
  '#f472b6', // pink-400
  '#a78bfa', // violet-400
  '#fb923c', // orange-400
  '#22d3ee', // cyan-400
  '#fb7185', // rose-400
  '#a3e635', // lime-400
  '#94a3b8', // slate-400
]

interface Props {
  highlightUid?: string | null
  /** When set, restrict lines + ranking to these uids only. Undefined = all users. */
  filterUids?: string[]
}

export function RankOverTime({ highlightUid, filterUids }: Props) {
  const t = useT()
  const [history, setHistory] = useState<Record<string, Record<string, number>> | null>(null)
  const [users, setUsers] = useState<Record<string, UserProfile> | null>(null)
  const [matches, setMatches] = useState<Record<string, Match> | null>(null)

  useEffect(() => {
    return onValue(ref(db, 'scoreHistory'), (snap) => {
      setHistory((snap.val() ?? {}) as Record<string, Record<string, number>>)
    })
  }, [])

  useEffect(() => {
    return onValue(ref(db, 'users'), (snap) => {
      setUsers((snap.val() ?? {}) as Record<string, UserProfile>)
    })
  }, [])

  useEffect(() => {
    return onValue(ref(db, 'matches'), (snap) => {
      setMatches((snap.val() ?? {}) as Record<string, Match>)
    })
  }, [])

  const { chartData, lines } = useMemo(() => {
    if (!history || !users || !matches) return { chartData: [], lines: [] }

    // Keys are `{kickoffAt}_{matchId}` — kickoffAt is a fixed-width ms
    // timestamp, so a lexical sort matches chronological order.
    const keys = Object.keys(history).sort()
    if (keys.length === 0) return { chartData: [], lines: [] }

    const allUids = Object.keys(users).sort()
    const uidColor: Record<string, string> = {}
    allUids.forEach((uid, i) => { uidColor[uid] = COLORS[i % COLORS.length]! })

    const uids = filterUids ? allUids.filter((u) => filterUids.includes(u)) : allUids
    if (uids.length === 0) return { chartData: [], lines: [] }

    // Synthetic "start" point so every line begins at 0 before the first
     // match snapshot.
    const startPoint: Record<string, string | number> = {
      idx: 0,
      matchLabel: t('home.pointsStart'),
    }
    for (const uid of uids) startPoint[uid] = 0

    const data: Record<string, string | number>[] = [startPoint]
    keys.forEach((key, i) => {
      const totals = history[key] ?? {}
      const matchId = key.slice(key.indexOf('_') + 1)
      const m = matches[matchId]
      const point: Record<string, string | number> = {
        idx: i + 1,
        matchLabel: m ? formatMatchLabel(m) : matchId,
      }
      for (const uid of uids) point[uid] = totals[uid] ?? 0
      data.push(point)
    })

    const lineDefs = uids.map((uid) => ({
      uid,
      name: users[uid]?.displayName ?? users[uid]?.email ?? uid.slice(0, 6),
      color: uidColor[uid]!,
    }))

    return { chartData: data, lines: lineDefs }
  }, [history, users, matches, filterUids, t])

  if (history === null || users === null || matches === null) return null
  if (chartData.length === 0) return null

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4">
      <h2 className="text-sm sm:text-base font-bold text-slate-200 mb-3 px-1">
        {t('home.pointsOverTime')}
      </h2>
      <div className="h-64 sm:h-80 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis
              dataKey="idx"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              stroke="#334155"
              tickMargin={6}
            />
            <YAxis
              allowDecimals
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              stroke="#334155"
              width={36}
            />
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
              itemStyle={{ color: '#e2e8f0' }}
              labelFormatter={(_label, payload) => {
                const p = payload?.[0]?.payload as { matchLabel?: string } | undefined
                return p?.matchLabel ?? ''
              }}
              formatter={(value, name) => {
                const line = lines.find((l) => l.uid === name)
                return [`${value} pts`, line?.name ?? String(name)]
              }}
            />
            {lines.map((line) => (
              <Line
                key={line.uid}
                type="monotone"
                dataKey={line.uid}
                name={line.uid}
                stroke={line.color}
                strokeWidth={line.uid === highlightUid ? 3 : 1.5}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-1 pt-3 text-xs">
        {lines.map((line) => (
          <span key={line.uid} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ background: line.color }}
            />
            <span className={line.uid === highlightUid ? 'text-slate-100 font-semibold' : 'text-slate-400'}>
              {line.name}
            </span>
          </span>
        ))}
      </div>
    </section>
  )
}

function formatMatchLabel(m: Match): string {
  if (m.score) return `${m.homeTeam} ${m.score.home}–${m.score.away} ${m.awayTeam}`
  return `${m.homeTeam} – ${m.awayTeam}`
}
