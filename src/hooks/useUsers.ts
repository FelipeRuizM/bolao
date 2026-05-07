import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import type { UserProfile } from '@/types'

export function useUsers() {
  const [users, setUsers] = useState<Record<string, UserProfile>>({})
  useEffect(() => {
    return onValue(ref(db, 'users'), (snap) => {
      setUsers((snap.val() as Record<string, UserProfile> | null) ?? {})
    })
  }, [])
  return users
}

export function displayNameFor(uid: string, profile: UserProfile | undefined): string {
  return profile?.displayName || profile?.email || uid.slice(0, 6)
}
