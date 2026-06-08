import { useEffect, useMemo, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import { useAuth } from '@/hooks/useAuth'
import type { UserProfile } from '@/types'

/** Users with no explicit group belong to this default (the original friends). */
export const DEFAULT_GROUP = 'main'

export function groupOf(profile: UserProfile | undefined): string {
  return profile?.group?.trim() || DEFAULT_GROUP
}

/**
 * Every user, unfiltered. For admin views that manage all friend groups at once
 * — regular player surfaces must use {@link useUsers} instead.
 */
export function useAllUsers() {
  const [users, setUsers] = useState<Record<string, UserProfile>>({})
  useEffect(() => {
    return onValue(ref(db, 'users'), (snap) => {
      setUsers((snap.val() as Record<string, UserProfile> | null) ?? {})
    })
  }, [])
  return users
}

/**
 * Users in the *current* user's friend group only. This is the single chokepoint
 * that keeps friend groups from seeing each other: every "list other players"
 * surface reads from here, so the group filtering lives in exactly one place.
 */
export function useUsers() {
  const { user } = useAuth()
  const all = useAllUsers()
  return useMemo(() => {
    const myGroup = user ? groupOf(all[user.uid]) : DEFAULT_GROUP
    const filtered: Record<string, UserProfile> = {}
    for (const [uid, profile] of Object.entries(all)) {
      if (groupOf(profile) === myGroup) filtered[uid] = profile
    }
    return filtered
  }, [all, user])
}

export function displayNameFor(uid: string, profile: UserProfile | undefined): string {
  return profile?.displayName || profile?.email || uid.slice(0, 6)
}
