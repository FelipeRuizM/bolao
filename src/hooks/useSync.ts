import { useEffect } from 'react'
import { maybeSync } from '@/api/sync'
import { useAuth } from '@/hooks/useAuth'

/** Mount-once sync trigger. Throttled — safe to call from any page. */
export function useSync() {
  const { user, status } = useAuth()
  useEffect(() => {
    if (status !== 'signed-in' || !user) return
    maybeSync(user.uid).catch((err) => {
      console.warn('Background sync failed:', err)
    })
  }, [user, status])
}
