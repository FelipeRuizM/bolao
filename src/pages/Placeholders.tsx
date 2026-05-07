import { useT } from '@/i18n'

function Placeholder({ titleKey }: { titleKey: string }) {
  const t = useT()
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
      <p className="text-slate-400 mt-2">{t('placeholder.comingSoon')}</p>
    </div>
  )
}

export const Me = () => <Placeholder titleKey="placeholder.myPicks" />
export const Bonus = () => <Placeholder titleKey="placeholder.bonusPicks" />
