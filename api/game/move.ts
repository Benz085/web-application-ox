import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requirePlayer } from '../../server/auth.js'
import { getDb } from '../../server/firebaseAdmin.js'
import { move } from '../../server/gameService.js'
import { assertMethod, parseBody, parseCell, parseGameId, respond } from '../../server/http.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await respond(res, async () => {
    assertMethod(req, 'POST')
    const user = await requirePlayer(req)
    const body = parseBody(req)
    const gameId = parseGameId(body)
    const cell = parseCell(body)
    return { body: await move(getDb(), user.uid, gameId, cell) }
  })
}
