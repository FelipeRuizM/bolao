import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n'

export function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: ReactNode
  adminOnly?: boolean
}) {
  const { status, isAdmin, signOutNow, error } = useAuth()
  const t = useT()

  if (status === 'loading') {
    return <div className="p-6 text-slate-400">{t('protected.loading')}</div>
  }
  if (status === 'error') {
    return (
      <div className="p-6 max-w-md mx-auto text-center space-y-4">
        <h1 className="text-xl font-bold text-red-400">{t('protected.connectionProblem')}</h1>
        <p className="text-slate-400 text-sm">{error}</p>
        <button onClick={signOutNow} className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600">
          {t('protected.signOutBtn')}
        </button>
      </div>
    )
  }
  if (status === 'signed-out') {
    return <Navigate to="/login" replace />
  }
  if (status === 'not-allowed') {
    return (
      <div className="p-6 max-w-md mx-auto text-center space-y-4">
        <h1 className="text-2xl font-bold">{t('protected.notInvited')}</h1>
        <p className="text-slate-400">{t('protected.notInvitedDesc')}</p>
        <button onClick={signOutNow} className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600">
          {t('protected.signOutBtn')}
        </button>
      </div>
    )
  }
  if (adminOnly && !isAdmin) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-400">{t('protected.adminOnly')}</p>
      </div>
    )
  }
  return <>{children}</>
}
