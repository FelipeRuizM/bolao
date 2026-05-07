import { vi } from 'vitest'

// Tests don't talk to a real Firebase project. Mock the singleton module
// so importing it (transitively, via api/* or hooks/*) doesn't trigger
// `getAuth(app)`'s API-key validation in CI (where there is no .env.local).
vi.mock('@/firebase', () => ({
  app: {},
  auth: {},
  db: {},
}))
