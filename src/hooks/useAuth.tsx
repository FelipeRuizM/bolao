import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { get, onValue, ref, set } from 'firebase/database'
import { auth, db } from '@/firebase'
import type { UserProfile } from '@/types'

export type AuthStatus = 'loading' | 'signed-out' | 'not-allowed' | 'signed-in' | 'error'

/**
 * Resolve a friend group for an email from the admin-managed
 * `meta/config/userGroups` list (entries of `{ email, group }`). Stored as a
 * list rather than a keyed map because emails contain '.', which RTDB keys
 * disallow. Returns undefined when there's no entry (→ the default group).
 */
async function lookupGroupForEmail(email: string | null | undefined): Promise<string | undefined> {
  if (!email) return undefined
  try {
    const snap = await get(ref(db, 'meta/config/userGroups'))
    const val = snap.val() as
      | Array<{ email?: string; group?: string }>
      | Record<string, { email?: string; group?: string }>
      | null
    if (!val) return undefined
    const entries = Array.isArray(val) ? val : Object.values(val)
    const target = email.toLowerCase()
    const found = entries.find((e) => e?.email?.toLowerCase() === target)
    return found?.group?.trim() || undefined
  } catch {
    return undefined
  }
}

interface AuthContextValue {
  user: User | null
  status: AuthStatus
  isAdmin: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOutNow: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authResolved, setAuthResolved] = useState(false)
  const [allowedEmails, setAllowedEmails] = useState<string[] | null>(null)
  const [adminUids, setAdminUids] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthResolved(true)
    })
  }, [])

  useEffect(() => {
    if (!user) {
      setAllowedEmails(null)
      return
    }
    return onValue(
      ref(db, 'meta/config/allowedEmails'),
      (snap) => {
        const val = snap.val() as string[] | Record<string, string> | null
        if (!val) return setAllowedEmails([])
        const list = Array.isArray(val) ? val : Object.values(val)
        setAllowedEmails(list.map((e) => e.toLowerCase()))
      },
      (err) => {
        setError(`Couldn't read allowedEmails: ${err.message}. Check Realtime DB rules.`)
      },
    )
  }, [user])

  useEffect(() => {
    if (!user) return
    return onValue(ref(db, `users/${user.uid}/role`), (snap) => {
      setAdminUids((prev) => ({ ...prev, [user.uid]: snap.val() === 'admin' }))
    })
  }, [user])

  const status: AuthStatus = useMemo(() => {
    if (error) return 'error'
    if (!authResolved) return 'loading'
    if (!user) return 'signed-out'
    if (allowedEmails === null) return 'loading'
    if (!user.email || !allowedEmails.includes(user.email.toLowerCase())) {
      return 'not-allowed'
    }
    return 'signed-in'
  }, [authResolved, user, allowedEmails, error])

  // Auto-create the /users/{uid} profile on first sign-in so new allowlisted
  // users appear on the leaderboard without manual Firebase Console work.
  // Locked-down /users rules permit this only when no profile exists yet.
  useEffect(() => {
    if (status !== 'signed-in' || !user) return
    let cancelled = false
    ;(async () => {
      try {
        const snap = await get(ref(db, `users/${user.uid}`))
        if (cancelled || snap.exists()) return
        const profile: UserProfile = {
          displayName: user.email?.split('@')[0] ?? user.uid.slice(0, 6),
          email: user.email ?? '',
          role: 'player',
        }
        // Stamp the friend group from the admin-managed email→group map so a new
        // member lands in the right group's leaderboard on their first login.
        const group = await lookupGroupForEmail(user.email)
        if (group) profile.group = group
        if (cancelled) return
        await set(ref(db, `users/${user.uid}`), profile)
      } catch (err) {
        console.warn('Failed to create user profile:', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status, user])

  const value: AuthContextValue = {
    user,
    status,
    error,
    isAdmin: !!user && !!adminUids[user.uid],
    async signIn(email, password) {
      setError(null)
      await signInWithEmailAndPassword(auth, email, password)
    },
    async signOutNow() {
      setError(null)
      await signOut(auth)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
