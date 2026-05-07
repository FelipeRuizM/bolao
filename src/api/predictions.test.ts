import { describe, it, expect, vi } from 'vitest'
import { PredictionLockedError, submitPrediction } from './predictions'

vi.mock('@/firebase', () => ({ db: {} }))
vi.mock('firebase/database', () => ({
  ref: () => ({}),
  serverTimestamp: () => ({ '.sv': 'timestamp' }),
  update: vi.fn(async () => undefined),
}))

describe('submitPrediction', () => {
  const future = Date.now() + 60_000
  const past = Date.now() - 60_000

  it('throws PredictionLockedError if kickoff has passed', async () => {
    await expect(submitPrediction('m1', 'u1', 1, 0, past)).rejects.toBeInstanceOf(
      PredictionLockedError,
    )
  })

  it('rejects negative scores', async () => {
    await expect(submitPrediction('m1', 'u1', -1, 0, future)).rejects.toThrow(/non-negative/)
  })

  it('rejects non-integer scores', async () => {
    await expect(submitPrediction('m1', 'u1', 1.5, 0, future)).rejects.toThrow(/integer/)
  })

  it('accepts valid prediction', async () => {
    await expect(submitPrediction('m1', 'u1', 2, 1, future)).resolves.toBeUndefined()
  })
})
