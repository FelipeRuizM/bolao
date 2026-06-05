/**
 * Backfills the value-free `predictionStatus/{matchId}/{uid} = true` index from
 * existing `/predictions`, so the "who has picked" indicators are accurate for
 * picks made before that index existed. Stores presence only — never scores.
 *
 * Safe to re-run (idempotent). Auth: see scripts/_firebase-admin.ts.
 * Run: npx tsx scripts/backfill-pick-status.ts
 */
import type { Prediction } from '../src/types'
import { initAdmin } from './_firebase-admin'

async function main(): Promise<void> {
  const db = initAdmin()
  const snap = await db.ref('predictions').get()
  const preds = (snap.val() ?? {}) as Record<string, Record<string, Prediction>>

  const updates: Record<string, boolean> = {}
  for (const [matchId, byUid] of Object.entries(preds)) {
    for (const uid of Object.keys(byUid ?? {})) {
      updates[`predictionStatus/${matchId}/${uid}`] = true
    }
  }

  if (Object.keys(updates).length === 0) {
    console.log('No predictions found — nothing to backfill.')
    return
  }
  await db.ref().update(updates)
  console.log(`Backfilled ${Object.keys(updates).length} pick-status flag(s).`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('backfill-pick-status failed:', err)
    process.exit(1)
  })
