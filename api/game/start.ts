import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requirePlayer } from '../../server/auth.js'
import { getDb } from '../../server/firebaseAdmin.js'
import { startGame } from '../../server/gameService.js'
import { assertMethod, parseBody, parseDifficulty, respond } from '../../server/http.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await respond(res, async () => {
    assertMethod(req, 'POST')
    const user = await requirePlayer(req)
    const difficulty = parseDifficulty(parseBody(req))
    return { status: 201, body: { game: await startGame(getDb(), user.uid, difficulty) } }
  })
}
