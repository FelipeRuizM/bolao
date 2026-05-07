import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded text-sm ${
    isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'
  }`

export function Navbar() {
  const { status, isAdmin, signOutNow } = useAuth()
  const t = useT()
  if (status !== 'signed-in') return null

  return (
    <nav className="border-b border-slate-800 bg-slate-900">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <span className="font-bold text-brand-500 mr-1 sm:mr-3">⚽ {t('brand')}</span>
        <NavLink to="/" end className={linkClass}>{t('nav.leaderboard')}</NavLink>
        <NavLink to="/matches" className={linkClass}>{t('nav.matches')}</NavLink>
        <NavLink to="/me" className={linkClass}>{t('nav.myPicks')}</NavLink>
        <NavLink to="/bonus" className={linkClass}>{t('nav.bonus')}</NavLink>
        {isAdmin && <NavLink to="/admin" className={linkClass}>{t('nav.admin')}</NavLink>}
        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher compact />
          <button
            onClick={signOutNow}
            className="text-sm px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 min-h-9"
          >
            {t('nav.signOut')}
          </button>
        </div>
      </div>
    </nav>
  )
}
