import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, User, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-500/10 text-brand-400' : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
  }`

export function Navbar() {
  const { status, isAdmin, signOutNow } = useAuth()
  const t = useT()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  if (status !== 'signed-in') return null

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const closeMenu = () => setIsMobileMenuOpen(false)

  return (
    <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <img 
              src="https://upload.wikimedia.org/wikipedia/en/1/17/2026_FIFA_World_Cup_emblem.svg" 
              alt="World Cup Logo" 
              className="w-6 h-8 sm:w-8 sm:h-10 object-contain drop-shadow-lg"
            />
            <span className="font-extrabold text-white text-xl sm:text-2xl tracking-widest">{t('brand')}</span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden sm:flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>{t('nav.leaderboard')}</NavLink>
            <NavLink to="/matches" className={linkClass}>{t('nav.matches')}</NavLink>
            <NavLink to="/me" className={linkClass}>{t('nav.myPicks')}</NavLink>
            <NavLink to="/bonus" className={linkClass}>{t('nav.bonus')}</NavLink>
            {isAdmin && <NavLink to="/admin" className={linkClass}>{t('nav.admin')}</NavLink>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <LocaleSwitcher compact />
            <NavLink
              to="/profile"
              aria-label={t('nav.profile')}
              title={t('nav.profile')}
              className={({ isActive }) =>
                `p-2 rounded transition-colors ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-400'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`
              }
            >
              <User size={18} />
            </NavLink>
            <button
              onClick={signOutNow}
              className="text-sm px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
            >
              {t('nav.signOut')}
            </button>
          </div>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="sm:hidden p-1.5 text-slate-300 hover:text-white transition-colors"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="sm:hidden px-4 pb-4 pt-2 border-t border-slate-800/50 bg-slate-900/95 backdrop-blur-xl">
          <div className="flex flex-col gap-1">
            <NavLink to="/" end className={linkClass} onClick={closeMenu}>{t('nav.leaderboard')}</NavLink>
            <NavLink to="/matches" className={linkClass} onClick={closeMenu}>{t('nav.matches')}</NavLink>
            <NavLink to="/me" className={linkClass} onClick={closeMenu}>{t('nav.myPicks')}</NavLink>
            <NavLink to="/bonus" className={linkClass} onClick={closeMenu}>{t('nav.bonus')}</NavLink>
            <NavLink to="/profile" className={linkClass} onClick={closeMenu}>{t('nav.profile')}</NavLink>
            {isAdmin && <NavLink to="/admin" className={linkClass} onClick={closeMenu}>{t('nav.admin')}</NavLink>}
            <div className="h-px bg-slate-800 my-2" />
            <div className="flex items-center justify-between px-2">
              <LocaleSwitcher compact />
              <button
                onClick={() => { signOutNow(); closeMenu(); }}
                className="text-sm px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300"
              >
                {t('nav.signOut')}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
