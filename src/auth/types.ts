export interface AuthUser {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
}

export type Unsubscribe = () => void

/** Shape shared by the real Firebase module and the e2e fake. */
export interface AuthModule {
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signOutUser: () => Promise<void>
  subscribe: (cb: (user: AuthUser | null) => void) => Unsubscribe
  getIdToken: () => Promise<string | null>
}
