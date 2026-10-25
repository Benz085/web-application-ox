/**
 * Minimal data-access abstraction so repos/services never import the Firebase SDK.
 * The Firestore adapter lives in firestoreDb.ts; tests can provide an in-memory fake.
 * Date values are stored as Date (adapter converts to/from Firestore Timestamp).
 */
export type Data = Record<string, unknown>

export interface DocSnap {
  id: string
  data: Data
}

export interface ListOptions {
  orderBy?: { field: string; direction: 'asc' | 'desc' }
  limit?: number
}

export interface DbReader {
  get(collection: string, id: string): Promise<Data | null>
  /** Documents whose `field` equals `value`. */
  queryEq(collection: string, field: string, value: unknown): Promise<DocSnap[]>
}

export interface DbTx extends DbReader {
  /** Reserve a new document id (no write). */
  newId(collection: string): string
  /** Create or fully replace a document. */
  set(collection: string, id: string, data: Data): void
  /** Partial update; the document must exist. */
  update(collection: string, id: string, patch: Data): void
}

export interface Db extends DbReader {
  list(collection: string, opts?: ListOptions): Promise<DocSnap[]>
  /** Create the document only if it does not exist yet. Resolves true if created. */
  createIfAbsent(collection: string, id: string, data: Data): Promise<boolean>
  /** Run `fn` in a transaction (all reads must happen before writes). */
  runTransaction<T>(fn: (tx: DbTx) => Promise<T>): Promise<T>
}

export const USERS = 'users'
export const GAMES = 'games'
export const CONFIG = 'config'
