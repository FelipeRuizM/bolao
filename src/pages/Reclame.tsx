import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useT } from '@/i18n'

// 🤡 Troll page: the "Reclame Aqui" button drops you here, full-screen image.
const IMAGE_URL = `${import.meta.env.BASE_URL}images/breno.jpeg`

export function Reclame() {
  const t = useT()
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-4">
      <Link
        to="/"
        aria-label={t('complain.close')}
        className="absolute top-4 right-4 z-10 rounded-full bg-slate-800/80 p-2 text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
      >
        <X size={24} />
      </Link>
      <img
        src={IMAGE_URL}
        alt={t('complain.button')}
        className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
      />
    </div>
  )
}
