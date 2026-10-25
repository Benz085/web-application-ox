import type { AuthModule } from './types'

let cached: Promise<AuthModule> | undefined

/**
 * Picks the auth implementation. The static VITE_E2E check lets the bundler drop the
 * e2e import (and the fake module) from production builds where the flag is not set.
 */
export function loadAuth(): Promise<AuthModule> {
  if (!cached) {
    cached =
      import.meta.env.VITE_E2E === 'true' ? import('./e2eAuth') : import('./firebase')
  }
  return cached
}
