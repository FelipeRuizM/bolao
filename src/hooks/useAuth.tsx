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
import { onValue, ref } from 'firebase/database'
import { auth, db } from '@/firebase'

export type AuthStatus = 'loading' | 'signed-out' | 'not-allowed' | 'signed-in' | 'error'

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
