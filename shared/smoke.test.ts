import { describe, expect, it } from 'vitest'
import { ADMIN_EMAIL } from './constants.js'
import { SMOKE } from './smoke.js'

describe('scaffold smoke', () => {
  it('loads shared modules', () => {
    expect(SMOKE).toBe('ok')
    expect(ADMIN_EMAIL).toBe('adminox@gmail.com')
  })
})
