import { Timestamp } from 'firebase-admin/firestore'
import type { Firestore, Transaction } from 'firebase-admin/firestore'
import type { Data, Db, DbTx, DocSnap } from './db.js'

function fromFirestore(raw: Record<string, unknown>): Data {
  const out: Data = {}
  for (const [k, v] of Object.entries(raw)) out[k] = v instanceof Timestamp ? v.toDate() : v
  return out
}

function toFirestore(data: Data): Data {
  // Firestore rejects undefined values; drop them.
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
}

function txAdapter(fs: Firestore, tx: Transaction): DbTx {
  return {
    async get(collection, id) {
      const snap = await tx.get(fs.collection(collection).doc(id))
      return snap.exists ? fromFirestore(snap.data() ?? {}) : null
    },
    async queryEq(collection, field, value) {
      const snap = await tx.get(fs.collection(collection).where(field, '==', value))
      return snap.docs.map((d): DocSnap => ({ id: d.id, data: fromFirestore(d.data()) }))
    },
    newId: (collection) => fs.collection(collection).doc().id,
    set(collection, id, data) {
      tx.set(fs.collection(collection).doc(id), toFirestore(data))
    },
    update(collection, id, patch) {
      tx.update(fs.collection(collection).doc(id), toFirestore(patch))
    },
  }
}

export function createFirestoreDb(fs: Firestore): Db {
  return {
    async get(collection, id) {
      const snap = await fs.collection(collection).doc(id).get()
      return snap.exists ? fromFirestore(snap.data() ?? {}) : null
    },
    async queryEq(collection, field, value) {
      const snap = await fs.collection(collection).where(field, '==', value).get()
      return snap.docs.map((d): DocSnap => ({ id: d.id, data: fromFirestore(d.data()) }))
    },
    async list(collection, opts = {}) {
      let q: FirebaseFirestore.Query = fs.collection(collection)
      if (opts.orderBy) q = q.orderBy(opts.orderBy.field, opts.orderBy.direction)
      if (opts.limit !== undefined) q = q.limit(opts.limit)
      const snap = await q.get()
      return snap.docs.map((d): DocSnap => ({ id: d.id, data: fromFirestore(d.data()) }))
    },
    async createIfAbsent(collection, id, data) {
      try {
        await fs.collection(collection).doc(id).create(toFirestore(data))
        return true
      } catch (err) {
        if (typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 6) return false // ALREADY_EXISTS
        throw err
      }
    },
    runTransaction: (fn) => fs.runTransaction((tx) => fn(txAdapter(fs, tx))),
  }
}
