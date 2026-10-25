import { cert, getApps, initializeApp } from 'firebase-admin/app'
import type { App } from 'firebase-admin/app'
import { getAuth as adminGetAuth } from 'firebase-admin/auth'
import type { Auth } from 'firebase-admin/auth'
import { getFirestore as adminGetFirestore } from 'firebase-admin/firestore'
import type { Firestore } from 'firebase-admin/firestore'
import type { Db } from './db.js'
import { createFirestoreDb } from './firestoreDb.js'
import { normalizePrivateKey } from './privateKey.js'

let app: App | undefined
let db: Db | undefined

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable ${name}`)
  return value
}

function getApp(): App {
  if (app) return app
  app = getApps()[0]
  if (!app) {
    app = initializeApp({
      credential: cert({
        projectId: requireEnv('FIREBASE_PROJECT_ID'),
        clientEmail: requireEnv('FIREBASE_CLIENT_EMAIL'),
        privateKey: normalizePrivateKey(requireEnv('FIREBASE_PRIVATE_KEY')),
      }),
    })
  }
  return app
}

export function getAuth(): Auth {
  return adminGetAuth(getApp())
}

export function getFirestore(): Firestore {
  return adminGetFirestore(getApp())
}

/** The Db used by handlers in production. */
export function getDb(): Db {
  db ??= createFirestoreDb(getFirestore())
  return db
}
