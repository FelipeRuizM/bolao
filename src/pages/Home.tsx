import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import { useAuth } from '@/hooks/useAuth'
import type { UserScore, UserProfile } from '@/types'

interface LeaderboardRow {
  uid: string
  displayName: string
  total: number
}

export function Home() {
  const { user } = useAuth()
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null)

  useEffect(() => {
    const unsubUsers = onValue(ref(db, 'users'), (usersSnap) => {
      const users = (usersSnap.val() ?? {}) as Record<string, UserProfile>
      onValue(ref(db, 'scores'), (scoresSnap) => {
        const scores = (scoresSnap.val() ?? {}) as Record<string, UserScore>
        const list = Object.entries(users).map(([uid, profile]) => ({
          uid,
          displayName: profile.displayName ?? profile.email ?? uid.slice(0, 6),
          total: scores[uid]?.total ?? 0,
        }))
        list.sort((a, b) => b.total - a.total)
        setRows(list)
      }, { onlyOnce: true })
    })
    return unsubUsers
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      {rows === null && <p className="text-slate-400">Loading…</p>}
      {rows !== null && rows.length === 0 && (
        <p className="text-slate-400">
          No players yet. Once admin creates accounts and they sign in, they'll show up here.
        </p>
      )}
      {rows !== null && rows.length > 0 && (
        <ol className="divide-y divide-slate-800 rounded-xl bg-slate-900 border border-slate-800">
          {rows.map((row, i) => (
            <li
              key={row.uid}
              className={`flex items-center gap-4 px-4 py-3 ${
                row.uid === user?.uid ? 'bg-slate-800/40' : ''
              }`}
            >
              <span className="w-8 text-center text-slate-500 font-mono">{i + 1}</span>
              <span className="flex-1">{row.displayName}</span>
              <span className="font-bold text-brand-500">{row.total}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
