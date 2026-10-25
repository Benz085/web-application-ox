import { ADMIN_EMAIL } from '../shared/constants.js'
import { HttpError } from './http.js'
import type { ReqLike } from './http.js'

/** Subset of the Firebase DecodedIdToken that we rely on. */
export interface TokenClaims {
  uid: string
  email?: string
  name?: string
  picture?: string
  firebase: { sign_in_provider: string }
}

export type VerifyIdToken = (token: string) => Promise<TokenClaims>

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string
  photoURL: string | null
  isAdmin: boolean
}

export function isAdminToken(decoded: TokenClaims): boolean {
  return (
    decoded.email?.toLowerCase() === ADMIN_EMAIL && decoded.firebase.sign_in_provider === 'password'
  )
}

/**
 * Players sign in with Google only. Anything else (e.g. a self-registered Email/Password account,
 * or a Google account that carries the admin's email) is neither a player nor the admin.
 */
export function isPlayerToken(decoded: TokenClaims): boolean {
  return (
    decoded.firebase.sign_in_provider === 'google.com' &&
    decoded.email?.toLowerCase() !== ADMIN_EMAIL
  )
}

const unauthenticated = () => new HttpError(401, 'UNAUTHENTICATED', 'Authentication required')

async function defaultVerify(): Promise<VerifyIdToken> {
  // Lazy import keeps the Firebase SDK out of unit tests that inject `verify`.
  const { getAuth } = await import('./firebaseAdmin.js')
  const auth = getAuth() // config errors surface as 500, not 401
  return (token) => auth.verifyIdToken(token)
}

function bearerToken(req: ReqLike): string | null {
  const header = req.headers.authorization ?? req.headers.Authorization
  const value = Array.isArray(header) ? header[0] : header
  if (!value) return null
  const match = /^Bearer ([^\s]+)$/i.exec(value.trim())
  return match ? match[1] : null
}

/** Verifies the Bearer ID token. Touches no data before verification succeeds. */
export async function authenticate(req: ReqLike, verify?: VerifyIdToken): Promise<AuthUser> {
  const token = bearerToken(req)
  if (!token) throw unauthenticated()
  const verifier = verify ?? (await defaultVerify())
  let decoded: TokenClaims
  try {
    decoded = await verifier(token)
  } catch {
    throw unauthenticated()
  }
  if (!isAdminToken(decoded) && !isPlayerToken(decoded)) {
    throw new HttpError(403, 'FORBIDDEN_ACCOUNT', 'This account type is not allowed')
  }
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    displayName: decoded.name?.trim() || (decoded.email ? decoded.email.split('@')[0] : 'Player'),
    photoURL: decoded.picture ?? null,
    isAdmin: isAdminToken(decoded),
  }
}

export const requireUser = authenticate

export async function requireAdmin(req: ReqLike, verify?: VerifyIdToken): Promise<AuthUser> {
  const user = await authenticate(req, verify)
  if (!user.isAdmin) throw new HttpError(403, 'FORBIDDEN', 'Administrator only')
  return user
}

export async function requirePlayer(req: ReqLike, verify?: VerifyIdToken): Promise<AuthUser> {
  const user = await authenticate(req, verify)
  if (user.isAdmin) throw new HttpError(403, 'ADMIN_ACCOUNT', 'Administrator accounts cannot play')
  return user
}
