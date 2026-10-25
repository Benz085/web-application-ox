import type { TokenClaims, VerifyIdToken } from '../../auth.js'

export const ADMIN = 'adminox@gmail.com'

export type TokenKind = 'player' | 'player2' | 'admin' | 'adminUpper' | 'nonAdminPassword' | 'googleAdminEmail' | 'noName' | 'noEmail'

const CLAIMS: Record<TokenKind, TokenClaims> = {
  player: { uid: 'u1', email: 'player1@example.test', name: 'Alice', picture: 'https://img.test/a.png', firebase: { sign_in_provider: 'google.com' } },
  player2: { uid: 'u2', email: 'player2@example.test', name: 'Bob', firebase: { sign_in_provider: 'google.com' } },
  admin: { uid: 'admin1', email: ADMIN, firebase: { sign_in_provider: 'password' } },
  adminUpper: { uid: 'admin1', email: 'AdminOX@Gmail.com', firebase: { sign_in_provider: 'password' } },
  nonAdminPassword: { uid: 'u3', email: 'someone@example.test', name: 'Carl', firebase: { sign_in_provider: 'password' } },
  googleAdminEmail: { uid: 'u4', email: ADMIN, name: 'Fake Admin', firebase: { sign_in_provider: 'google.com' } },
  noName: { uid: 'u5', email: 'noname@example.test', name: '   ', firebase: { sign_in_provider: 'google.com' } },
  noEmail: { uid: 'u6', firebase: { sign_in_provider: 'google.com' } },
}

export const claimsFor = (kind: TokenKind): TokenClaims => structuredClone(CLAIMS[kind])
export const tokenFor = (kind: TokenKind): string => `valid:${kind}`
export const bearer = (kind: TokenKind): Record<string, string> => ({ authorization: `Bearer ${tokenFor(kind)}` })

/** Fake verifier: `valid:<kind>` succeeds, anything else (expired / forged) rejects. */
export const fakeVerify: VerifyIdToken = async (token) => {
  const m = /^valid:(\w+)$/.exec(token)
  if (!m || !(m[1] in CLAIMS)) throw new Error('auth/id-token-expired')
  return claimsFor(m[1] as TokenKind)
}
