import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded text-sm ${
    isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'
  }`

export function Navbar() {
  const { status, isAdmin, signOutNow, user } = useAuth()
  if (status !== 'signed-in') return null

  return (
    <nav className="border-b border-slate-800 bg-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-2 flex-wrap">
        <span className="font-bold text-brand-500 mr-4">⚽ WC Pool</span>
        <NavLink to="/" end className={linkClass}>Leaderboard</NavLink>
        <NavLink to="/matches" className={linkClass}>Matches</NavLink>
        <NavLink to="/me" className={linkClass}>My Picks</NavLink>
        <NavLink to="/bonus" className={linkClass}>Bonus</NavLink>
        {isAdmin && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">{user?.email}</span>
          <button
            onClick={signOutNow}
            className="text-sm px-3 py-2 rounded bg-slate-800 hover:bg-slate-700"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
