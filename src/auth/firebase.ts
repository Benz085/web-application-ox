import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
} from 'firebase/auth'
import type { AuthUser, Unsubscribe } from '@/web-app-ox/auth/types'

// Lazy init so importing this module never throws when env values are missing.
function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp()
  return initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  })
}

function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp())
}

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider())
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), email, password)
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth())
}

export function subscribe(cb: (user: AuthUser | null) => void): Unsubscribe {
  return onIdTokenChanged(getFirebaseAuth(), (fbUser) => {
    cb(
      fbUser
        ? {
            uid: fbUser.uid,
            displayName: fbUser.displayName,
            email: fbUser.email,
            photoURL: fbUser.photoURL,
          }
        : null,
    )
  })
}

/** Returns a fresh ID token (the SDK refreshes it when expired), or null when signed out. */
export async function getIdToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser
  return user ? user.getIdToken() : null
}
