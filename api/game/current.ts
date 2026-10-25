import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requirePlayer } from '../../server/auth.js'
import { getDb } from '../../server/firebaseAdmin.js'
import { getCurrentGame } from '../../server/gameService.js'
import { assertMethod, respond } from '../../server/http.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await respond(res, async () => {
    assertMethod(req, 'GET')
    const user = await requirePlayer(req)
    return { body: { game: await getCurrentGame(getDb(), user.uid) } }
  })
}
