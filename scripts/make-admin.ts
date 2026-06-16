/**
 * Create (or promote) an admin account in a Firebase project.
 *
 * An "admin" in this app is a user who is BOTH:
 *   1. a Firebase Auth user (email/password),
 *   2. on the allowlist at  meta/config/allowedEmails, and
 *   3. has  users/{uid}/role === 'admin'.
 *
 * This script does all three, idempotently: it creates the Auth user if missing
 * (or updates the password if given), adds the email to the allowlist, and
 * writes/merges the /users profile with role=admin. Safe to re-run.
 *
 * Auth (see scripts/_firebase-admin.ts): needs FIREBASE_DATABASE_URL and
 * FIREBASE_SERVICE_ACCOUNT_PATH for the target project. With a dev .env file:
 *
 *   npx tsx --env-file=.env.development.local scripts/make-admin.ts \
 *     --email you@example.com --password 'secret'
 *
 * Flags: --email (required), --password (optional; sets/updates the password).
 */
import admin from 'firebase-admin'
import type { UserProfile } from '../src/types'
import { initAdmin } from './_firebase-admin'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main(): Promise<void> {
  const email = arg('email')?.trim().toLowerCase()
  const password = arg('password')
  if (!email) throw new Error('--email is required')

  const db = initAdmin()
  const auth = admin.auth()

  // 1) Auth user — find or create, optionally (re)set the password.
  let user: admin.auth.UserRecord
  let created = false
  try {
    user = await auth.getUserByEmail(email)
    if (password) await auth.updateUser(user.uid, { password })
  } catch {
    user = await auth.createUser({ email, password, emailVerified: true })
    created = true
  }
  const uid = user.uid

  // 2) Allowlist — append, lowercase, dedupe.
  const snap = await db.ref('meta/config/allowedEmails').get()
  const existing = snap.val() as string[] | Record<string, string> | null
  const list = existing ? (Array.isArray(existing) ? existing : Object.values(existing)) : []
  const allowed = Array.from(new Set([...list.map((e) => String(e).toLowerCase()), email]))

  // 3) /users profile — merge so we never clobber an existing displayName.
  const profileSnap = await db.ref(`users/${uid}`).get()
  const existingProfile = (profileSnap.val() ?? {}) as Partial<UserProfile>
  const profile: UserProfile = {
    displayName: existingProfile.displayName ?? email.split('@')[0],
    email,
    role: 'admin',
    ...(existingProfile.group ? { group: existingProfile.group } : {}),
  }

  await db.ref().update({
    'meta/config/allowedEmails': allowed,
    [`users/${uid}`]: profile,
  })

  console.log(`${created ? 'Created' : 'Updated'} admin account:`)
  console.log(`  email : ${email}`)
  console.log(`  uid   : ${uid}`)
  if (password) console.log(`  password: ${password}`)
  console.log(`  role  : admin (allowlisted)`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('make-admin failed:', err)
    process.exit(1)
  })
