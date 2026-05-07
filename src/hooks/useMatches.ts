import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import type { Match } from '@/types'

export function useMatches() {
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onValue(
      ref(db, 'matches'),
      (snap) => {
        const val = (snap.val() ?? {}) as Record<string, Match>
        const list = Object.values(val).sort((a, b) => a.kickoffAt - b.kickoffAt)
        setMatches(list)
      },
      (err) => setError(err.message),
    )
  }, [])

  return { matches, error }
}

export function useMatch(matchId: string | undefined) {
  const [match, setMatch] = useState<Match | null | undefined>(undefined)

  useEffect(() => {
    if (!matchId) {
      setMatch(null)
      return
    }
    return onValue(ref(db, `matches/${matchId}`), (snap) => {
      setMatch((snap.val() as Match | null) ?? null)
    })
  }, [matchId])

  return match
}
