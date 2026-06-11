import { useEffect, useMemo, useState } from 'react'
import { setBonusAnswers, setBonusValues, setLockBonusAt } from '@/api/admin'
import { useConfig } from '@/hooks/useConfig'
import { useMatches } from '@/hooks/useMatches'
import { DEFAULT_BONUS_VALUES, type BonusAnswers, type BonusValues } from '@/scoring'
import { useT } from '@/i18n'
import { BR_TZ, brDayKey } from '@/utils/datetime'
import { AdminButton, AdminCard, NumberField, StatusLine } from './AdminCard'

/** lockBonusAt (epoch ms) → datetime-local value, rendered in Brazil time. */
function toLockInput(ms: number): string {
  const time = new Date(ms).toLocaleTimeString('en-GB', {
    timeZone: BR_TZ,
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${brDayKey(ms)}T${time}`
}

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

  const [lockInput, setLockInput] = useState('')
  const [lockBusy, setLockBusy] = useState(false)
  const [lockOk, setLockOk] = useState<string | null>(null)
  const [lockErr, setLockErr] = useState<string | null>(null)

  useEffect(() => {
    if (config) {
      setValues(config.bonusValues)
      setAnswers(config.bonusAnswers)
      if (config.lockBonusAt !== null) setLockInput(toLockInput(config.lockBonusAt))
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

  async function saveLock() {
    // Brazil has had no DST since 2019, so BRT is a fixed -03:00 offset.
    const ms = Date.parse(`${lockInput}:00-03:00`)
    if (Number.isNaN(ms)) {
      setLockErr(t('admin.bonusLockInvalid'))
      return
    }
    setLockBusy(true)
    setLockOk(null)
    setLockErr(null)
    try {
      await setLockBonusAt(ms)
      setLockOk(t('admin.bonusLockSaved'))
    } catch (e) {
      setLockErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLockBusy(false)
    }
  }

  return (
    <>
      <AdminCard title={t('admin.bonusLockHeading')} description={t('admin.bonusLockDesc')}>
        <label className="block">
          <span className="text-xs text-slate-400">{t('admin.bonusLockLabel')}</span>
          <input
            type="datetime-local"
            value={lockInput}
            onChange={(e) => setLockInput(e.target.value)}
            className="mt-1 w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-base focus:outline-none focus:border-brand-500"
          />
        </label>
        <AdminButton
          label={t('admin.bonusLockSave')}
          busyLabel={t('admin.saving')}
          busy={lockBusy}
          onClick={saveLock}
        />
        <StatusLine ok={lockOk} err={lockErr} />
      </AdminCard>

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
          <NumberField
            label={t('admin.bonusBestPlayerLabel')}
            value={values.bestPlayer}
            onChange={(v) => setValues((p) => ({ ...p, bestPlayer: v }))}
          />
          <NumberField
            label={t('admin.bonusBestYoungPlayerLabel')}
            value={values.bestYoungPlayer}
            onChange={(v) => setValues((p) => ({ ...p, bestYoungPlayer: v }))}
          />
          <NumberField
            label={t('admin.bonusBestGoalkeeperLabel')}
            value={values.bestGoalkeeper}
            onChange={(v) => setValues((p) => ({ ...p, bestGoalkeeper: v }))}
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
                {t.team(team)}
              </option>
            ))}
          </select>
        </label>

        <AnswerField
          label={t('admin.bonusTopScorerLabel')}
          value={answers.topScorer}
          onChange={(v) => setAnswers((p) => ({ ...p, topScorer: v }))}
          placeholder={t('admin.bonusTopScorerPlaceholder')}
        />
        <AnswerField
          label={t('admin.bonusBestPlayerLabel')}
          value={answers.bestPlayer}
          onChange={(v) => setAnswers((p) => ({ ...p, bestPlayer: v }))}
          placeholder={t('admin.bonusTopScorerPlaceholder')}
        />
        <AnswerField
          label={t('admin.bonusBestYoungPlayerLabel')}
          value={answers.bestYoungPlayer}
          onChange={(v) => setAnswers((p) => ({ ...p, bestYoungPlayer: v }))}
          placeholder={t('admin.bonusTopScorerPlaceholder')}
        />
        <AnswerField
          label={t('admin.bonusBestGoalkeeperLabel')}
          value={answers.bestGoalkeeper}
          onChange={(v) => setAnswers((p) => ({ ...p, bestGoalkeeper: v }))}
          placeholder={t('admin.bonusTopScorerPlaceholder')}
        />

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

function AnswerField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string | undefined
  onChange: (v: string | undefined) => void
  placeholder: string
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={placeholder}
        className="mt-1 w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-base focus:outline-none focus:border-brand-500"
      />
    </label>
  )
}
