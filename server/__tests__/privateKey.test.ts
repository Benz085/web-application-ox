import { describe, expect, it } from 'vitest'
import { normalizePrivateKey } from '../privateKey.js'

const PEM = '-----BEGIN PRIVATE KEY-----\nabc\ndef\n-----END PRIVATE KEY-----\n'

describe('normalizePrivateKey', () => {
  it('converts literal \\n sequences into newlines', () => {
    expect(normalizePrivateKey(PEM.replace(/\n/g, '\\n'))).toBe(PEM)
  })

  it('keeps a key that already has real newlines (outer whitespace is trimmed)', () => {
    expect(normalizePrivateKey(PEM)).toBe(PEM.trim())
  })

  it('strips surrounding double or single quotes', () => {
    expect(normalizePrivateKey(`"${PEM.replace(/\n/g, '\\n')}"`)).toBe(PEM)
    expect(normalizePrivateKey(`'${PEM}'`)).toBe(PEM)
  })

  it('strips quotes around a multi-line value and surrounding whitespace', () => {
    expect(normalizePrivateKey(`  "${PEM}"  \n`)).toBe(PEM)
  })

  it('does not strip a quote that has no partner', () => {
    expect(normalizePrivateKey('"abc')).toBe('"abc')
  })
})
