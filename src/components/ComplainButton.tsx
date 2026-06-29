import { Link } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAllUsers, groupOf } from '@/hooks/useUsers'
import { useT } from '@/i18n'

// 🤡 Troll feature: the floating "Reclame Aqui" button just sends you to the
// full-screen image page (/reclame). Hidden for the "simo" group.
const HIDDEN_GROUPS = ['simo']

export function ComplainButton() {
  const t = useT()
  const { user } = useAuth()
  const users = useAllUsers()

  const group = user ? groupOf(users[user.uid]) : ''
  if (HIDDEN_GROUPS.includes(group.toLowerCase())) return null

  return (
    <Link
      to="/reclame"
      title={t('complain.button')}
      className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-900/40 transition-transform hover:scale-105 hover:bg-rose-500 active:scale-95"
    >
      <Megaphone size={18} />
      <span className="hidden sm:inline">{t('complain.button')}</span>
    </Link>
  )
}
