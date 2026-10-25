import { CONFIG } from './db.js'
import type { DbReader } from './db.js'
import { resolveMistakeRate } from '../shared/bot.js'

/** `config/bot.hardMistakeRate`; falls back to the default when missing/invalid/unreadable. */
export async function getHardMistakeRate(db: DbReader): Promise<number> {
  try {
    const doc = await db.get(CONFIG, 'bot')
    return resolveMistakeRate(doc?.hardMistakeRate)
  } catch {
    return resolveMistakeRate(undefined)
  }
}
