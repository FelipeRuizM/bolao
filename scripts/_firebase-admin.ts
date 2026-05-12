/**
 * Shared Firebase Admin SDK init for scripts.
 *
 * Credential source (in priority order):
 *   1. FIREBASE_SERVICE_ACCOUNT_PATH — path to a JSON key file (preferred for
 *      local dev; the file is gitignored).
 *   2. FIREBASE_SERVICE_ACCOUNT — raw JSON string (used by CI via secrets).
 *
 * FIREBASE_DATABASE_URL is required either way.
 */
import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'

export function initAdmin(): admin.database.Database {
  const databaseURL = process.env.FIREBASE_DATABASE_URL
  if (!databaseURL) throw new Error('FIREBASE_DATABASE_URL env var is required')

  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT

  let serviceAccount: admin.ServiceAccount
  if (path) {
    serviceAccount = JSON.parse(readFileSync(path, 'utf8'))
  } else if (raw) {
    serviceAccount = JSON.parse(raw)
  } else {
    throw new Error(
      'Set FIREBASE_SERVICE_ACCOUNT_PATH (JSON file path) or FIREBASE_SERVICE_ACCOUNT (raw JSON).',
    )
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  })
  return admin.database()
}
