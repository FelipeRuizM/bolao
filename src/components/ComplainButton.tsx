import { useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import { useT } from '@/i18n'

// 🤡 Troll feature: clicking "Reclame Aqui" pops one of these images at random.
// Add image URLs here — anything the browser can load (https links, data URIs).
const COMPLAINT_IMAGES: string[] = [
  "https://x.com/juziuzi/status/1067216988563562496/photo/1",
  // 'https://example.com/funny2.gif',
]

function pickRandom(): string | null {
  if (COMPLAINT_IMAGES.length === 0) return null
  return COMPLAINT_IMAGES[Math.floor(Math.random() * COMPLAINT_IMAGES.length)]
}

export function ComplainButton() {
  const t = useT()
  const [image, setImage] = useState<string | null>(null)

  return (
    <>
      <button
        onClick={() => setImage(pickRandom())}
        title={t('complain.button')}
        className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-900/40 transition-transform hover:scale-105 hover:bg-rose-500 active:scale-95"
      >
        <Megaphone size={18} />
        <span className="hidden sm:inline">{t('complain.button')}</span>
      </button>

      {image && (
        <div
          onClick={() => setImage(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <button
            onClick={() => setImage(null)}
            aria-label={t('complain.close')}
            className="absolute top-4 right-4 rounded-full bg-slate-800/80 p-2 text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <X size={24} />
          </button>
          <img
            src={image}
            alt={t('complain.button')}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  )
}
