import { useEffect, useMemo, useState } from 'react'
import { setBonusAnswers, setBonusValues } from '@/api/admin'
import { useConfig } from '@/hooks/useConfig'
import { useMatches } from '@/hooks/useMatches'
import { DEFAULT_BONUS_VALUES, type BonusAnswers, type BonusValues } from '@/scoring'
import { useT } from '@/i18n'
import { AdminButton, AdminCard, NumberField, StatusLine } from './AdminCard'

export function BonusAdminSection() {
  const t = useT()
  const config = useConfig()
  const { matches } = useMatches()

  const [values, setValues] = useState<BonusValues>(DEFAULT_BONUS_VALUES)
  const [valuesBusy, setValuesBusy] = useState(false)
  const [valuesOk, setValuesOk] = useState<string | null>(null)
  const [valuesErr, setValuesErr] = useState<string | null>(null)

  const [answers, setAnswers] = useState<BonusAnswers>({})
  const [answersBusy, setAnswersBusy] = useState(false)
  const [answersOk, setAnswersOk] = useState<string | null>(null)
  const [answersErr, setAnswersErr] = useState<string | null>(null)

  useEffect(() => {
    if (config) {
      setValues(config.bonusValues)
      setAnswers(config.bonusAnswers)
    }
  }, [config])

  const teams = useMemo(() => {
    if (!matches) return []
    const set = new Set<string>()
    for (const m of matches) {
      if (m.group) {
        set.add(m.homeTeam)
        set.add(m.awayTeam)
      }
    }
    return Array.from(set).sort()
  }, [matches])

  async function saveValues() {
    setValuesBusy(true)
    setValuesOk(null)
    setValuesErr(null)
    try {
      await setBonusValues(values)
      setValuesOk(t('admin.savedAndRecomputed'))
    } catch (e) {
      setValuesErr(e instanceof Error ? e.message : String(e))
    } finally {
      setValuesBusy(false)
    }
  }

  async function saveAnswers() {
    setAnswersBusy(true)
    setAnswersOk(null)
    setAnswersErr(null)
    try {
      await setBonusAnswers(answers)
      setAnswersOk(t('admin.savedAndRecomputed'))
    } catch (e) {
      setAnswersErr(e instanceof Error ? e.message : String(e))
    } finally {
      setAnswersBusy(false)
    }
  }

  return (
    <>
      <AdminCard title={t('admin.bonusValuesHeading')} description={t('admin.bonusValuesDesc')}>
        <div className="space-y-2">
          <NumberField
            label={t('admin.bonusWinnerLabel')}
            value={values.tournamentWinner}
            onChange={(v) => setValues((p) => ({ ...p, tournamentWinner: v }))}
          />
          <NumberField
            label={t('admin.bonusTopScorerLabel')}
            value={values.topScorer}
            onChange={(v) => setValues((p) => ({ ...p, topScorer: v }))}
          />
        </div>
        <AdminButton
          label={t('admin.saveAndRecompute')}
          busyLabel={t('admin.saving')}
          busy={valuesBusy}
          onClick={saveValues}
        />
        <StatusLine ok={valuesOk} err={valuesErr} />
      </AdminCard>

      <AdminCard title={t('admin.bonusAnswersHeading')} description={t('admin.bonusAnswersDesc')}>
        <label className="block">
          <span className="text-xs text-slate-400">{t('admin.bonusWinnerLabel')}</span>
          <select
            value={answers.tournamentWinner ?? ''}
            onChange={(e) =>
              setAnswers((p) => ({ ...p, tournamentWinner: e.target.value || undefined }))
            }
            className="mt-1 w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-base focus:outline-none focus:border-brand-500"
          >
            <option value="">{t('admin.bonusAnswerNotSet')}</option>
            {teams.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-slate-400">{t('admin.bonusTopScorerLabel')}</span>
          <input
            type="text"
            value={answers.topScorer ?? ''}
            onChange={(e) => setAnswers((p) => ({ ...p, topScorer: e.target.value || undefined }))}
            placeholder={t('admin.bonusTopScorerPlaceholder')}
            className="mt-1 w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-base focus:outline-none focus:border-brand-500"
          />
        </label>

        <AdminButton
          label={t('admin.saveAndRecompute')}
          busyLabel={t('admin.saving')}
          busy={answersBusy}
          onClick={saveAnswers}
        />
        <StatusLine ok={answersOk} err={answersErr} />
      </AdminCard>
    </>
  )
}
