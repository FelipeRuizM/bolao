import { ref, update } from 'firebase/database'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { db } from '@/firebase'

export async function updateDisplayName(uid: string, displayName: string): Promise<void> {
  const trimmed = displayName.trim()
  if (trimmed.length === 0) throw new Error('Display name cannot be empty.')
  if (trimmed.length > 40) throw new Error('Display name is too long (max 40 chars).')
  await update(ref(db, `users/${uid}`), { displayName: trimmed })
}

export async function changePassword(
  user: User,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!user.email) throw new Error('Account has no email — cannot change password.')
  if (newPassword.length < 6) throw new Error('New password must be at least 6 characters.')
  // Firebase requires a recent sign-in for password changes; reauthenticate
  // with the current password to satisfy that without forcing a sign-out.
  const cred = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, cred)
  await updatePassword(user, newPassword)
}
