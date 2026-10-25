import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate } from '../server/auth.js'
import { getDb } from '../server/firebaseAdmin.js'
import { assertMethod, respond } from '../server/http.js'
import { listLeaderboard } from '../server/userRepo.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await respond(res, async () => {
    assertMethod(req, 'GET')
    await authenticate(req)
    return { body: { players: await listLeaderboard(getDb()) } }
  })
}
