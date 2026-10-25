import type { VercelRequest, VercelResponse } from '@vercel/node'
import { SMOKE } from '../shared/smoke.js'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ status: SMOKE })
}
