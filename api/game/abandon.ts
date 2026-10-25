import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requirePlayer } from '../../server/auth.js'
import { getDb } from '../../server/firebaseAdmin.js'
import { abandon } from '../../server/gameService.js'
import { assertMethod, parseBody, parseGameId, respond } from '../../server/http.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await respond(res, async () => {
    assertMethod(req, 'POST')
    const user = await requirePlayer(req)
    const gameId = parseGameId(parseBody(req))
    return { body: await abandon(getDb(), user.uid, gameId) }
  })
}
