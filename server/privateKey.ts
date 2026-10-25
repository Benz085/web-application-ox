/**
 * Turns the FIREBASE_PRIVATE_KEY env value into a PEM string. Hosting UIs and .env files store it in
 * different shapes: with literal "\n" sequences, with real newlines, or wrapped in quotes (a common
 * copy/paste slip on Vercel). All of them are accepted.
 */
export function normalizePrivateKey(raw: string): string {
  const unquoted = raw.trim().replace(/^(["'])([\s\S]*)\1$/, '$2')
  return unquoted.replace(/\\n/g, '\n')
}
