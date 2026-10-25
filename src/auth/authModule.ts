import type { AuthModule } from 'web-app-ox/auth/types'

let cached: Promise<AuthModule> | undefined

/**
 * Picks the auth implementation. The static VITE_E2E check lets the bundler drop the
 * e2e import (and the fake module) from production builds where the flag is not set.
 */
export function loadAuth(): Promise<AuthModule> {
  if (!cached) {
    cached =
      import.meta.env.VITE_E2E === 'true' ? import('web-app-ox/auth/e2eAuth') : import('web-app-ox/auth/firebase')
  }
  return cached
}
