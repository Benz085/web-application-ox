import type { Page } from '@playwright/test'

/**
 * Test-only patches of the fake auth module (`src/auth/e2eAuth.ts`), applied to the module
 * served by Vite inside the browser. Source files are not touched. Each patch fails loudly
 * if the expected code is not found, so a refactor cannot silently turn it into a no-op.
 */

export interface AuthPatches {
  /** Make `signInWithGoogle` go through a controllable hook (delay / reject). */
  google?: GoogleControl
  /** Password that the fake email sign-in rejects as invalid. */
  rejectPassword?: string
  /** Fake player has no display name (falls back to email prefix). */
  playerWithoutDisplayName?: boolean
}

/** Controls the patched Google sign-in. `hold()` keeps it pending, `failWith(code)` rejects it. */
export class GoogleControl {
  calls = 0
  private gate: Promise<void> | null = null
  private errorCode: string | null = null

  hold(): () => void {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = () => {
        if (this.gate === gate) this.gate = null
        resolve()
      }
    })
    this.gate = gate
    return release
  }

  failWith(code: string | null): void {
    this.errorCode = code
  }

  async run(): Promise<string | null> {
    this.calls += 1
    if (this.gate) await this.gate
    return this.errorCode
  }
}

function replaceOnce(source: string, pattern: RegExp, replacement: string, label: string): string {
  if (!pattern.test(source)) throw new Error(`e2e patch "${label}" did not match e2eAuth.ts`)
  return source.replace(pattern, replacement)
}

export async function patchAuth(page: Page, patches: AuthPatches): Promise<void> {
  if (patches.google) {
    const control = patches.google
    await page.exposeFunction('__e2eGoogle', () => control.run())
  }
  await page.route(
    (url) => url.pathname === '/src/auth/e2eAuth.ts',
    async (route) => {
      const response = await route.fetch()
      let source = await response.text()
      if (patches.google) {
        source = replaceOnce(
          source,
          /export async function signInWithGoogle\(\)\s*\{/,
          `export async function signInWithGoogle() {
  const __code = await window.__e2eGoogle();
  if (__code) throw Object.assign(new Error(__code), { code: __code });`,
          'google',
        )
      }
      if (patches.rejectPassword !== undefined) {
        source = replaceOnce(
          source,
          /password\.length > 0/,
          `password.length > 0 && password !== ${JSON.stringify(patches.rejectPassword)}`,
          'rejectPassword',
        )
      }
      if (patches.playerWithoutDisplayName) {
        source = replaceOnce(source, /displayName:\s*["']Alex Morgan["']/, 'displayName: null', 'displayName')
      }
      await route.fulfill({ response, body: source })
    },
  )
}
