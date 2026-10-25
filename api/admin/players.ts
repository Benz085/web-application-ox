import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from '../../server/auth.js'
import { getDb } from '../../server/firebaseAdmin.js'
import { assertMethod, respond } from '../../server/http.js'
import { listAllPlayers } from '../../server/userRepo.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await respond(res, async () => {
    assertMethod(req, 'GET')
    await requireAdmin(req)
    return { body: { players: await listAllPlayers(getDb()) } }
  })
}
