import { Link } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAllUsers, groupOf } from '@/hooks/useUsers'
import { useT } from '@/i18n'

// 🤡 Troll feature: the floating "Reclame Aqui" button just sends you to the
// full-screen image page (/reclame). Hidden for the "simo" group.
const HIDDEN_GROUPS = ['simo']

/** Whether the current user's group is allowed to see the "Reclame Aqui" entry. */
export function useComplainEnabled() {
  const { user } = useAuth()
  const users = useAllUsers()
  const group = user ? groupOf(users[user.uid]) : ''
  return !HIDDEN_GROUPS.includes(group.toLowerCase())
}

export function ComplainButton() {
  const t = useT()
  const enabled = useComplainEnabled()
  if (!enabled) return null

  // Floating button is desktop-only — on mobile it overlaps the hamburger menu,
  // so the entry lives inside that menu instead (see Navbar).
  return (
    <Link
      to="/reclame"
      title={t('complain.button')}
      className="hidden sm:flex fixed bottom-4 right-4 z-[60] items-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-900/40 transition-transform hover:scale-105 hover:bg-rose-500 active:scale-95"
    >
      <Megaphone size={18} />
      <span>{t('complain.button')}</span>
    </Link>
  )
}
