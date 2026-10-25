import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate } from '../server/auth.js'
import { getDb } from '../server/firebaseAdmin.js'
import { assertMethod, respond } from '../server/http.js'
import { getOrCreateProfile } from '../server/userRepo.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await respond(res, async () => {
    assertMethod(req, 'GET')
    const user = await authenticate(req)
    if (user.isAdmin) return { body: { profile: null, isAdmin: true } }
    const profile = await getOrCreateProfile(getDb(), user.uid, {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    })
    return { body: { profile, isAdmin: false } }
  })
}
