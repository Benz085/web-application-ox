import '@/web-app-ox/test/setup'
import { describe, expect, it } from 'vitest'
import { ADMIN_DISPLAY_NAME, ADMIN_INITIALS, getDisplayName, getInitials } from '@/web-app-ox/auth/displayName'
import type { AuthUser } from '@/web-app-ox/auth/types'

const user = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  uid: 'u1',
  displayName: null,
  email: null,
  photoURL: null,
  ...overrides,
})

describe('getDisplayName', () => {
  it('uses the Firebase display name', () => {
    expect(getDisplayName(user({ displayName: 'Alex Morgan', email: 'a@b.test' }), false)).toBe('Alex Morgan')
  })

  it('trims the Firebase display name', () => {
    expect(getDisplayName(user({ displayName: '  Alex  ' }), false)).toBe('Alex')
  })

  it.each([null, '', '   '])('falls back to the email local part when displayName is %j', (displayName) => {
    expect(getDisplayName(user({ displayName, email: 'alex.morgan@example.test' }), false)).toBe('alex.morgan')
  })

  it('falls back to "Player" without name and email', () => {
    expect(getDisplayName(user(), false)).toBe('Player')
  })

  it('falls back to "Player" when the email has an empty local part', () => {
    expect(getDisplayName(user({ email: '@example.test' }), false)).toBe('Player')
  })

  it('returns "Admin OX" for admins regardless of the Firebase name', () => {
    expect(ADMIN_DISPLAY_NAME).toBe('Admin OX')
    expect(getDisplayName(user({ displayName: 'Someone', email: 'adminox@gmail.com' }), true)).toBe('Admin OX')
  })
})

describe('getInitials', () => {
  it('returns "AO" for admins', () => {
    expect(ADMIN_INITIALS).toBe('AO')
    expect(getInitials('Admin OX', true)).toBe('AO')
  })

  it('uses the first letters of the first and last word', () => {
    expect(getInitials('alex morgan', false)).toBe('AM')
    expect(getInitials('Mary Jane Watson', false)).toBe('MW')
  })

  it('uses the first two letters of a single word', () => {
    expect(getInitials('adminox', false)).toBe('AD')
    expect(getInitials('x', false)).toBe('X')
  })

  it('returns "?" for an empty name', () => {
    expect(getInitials('', false)).toBe('?')
  })
})
