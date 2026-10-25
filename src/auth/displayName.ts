import type { AuthUser } from '@/web-app-ox/auth/types'

export const ADMIN_DISPLAY_NAME = 'Admin OX'
export const ADMIN_INITIALS = 'AO'

export function getDisplayName(user: AuthUser, isAdmin: boolean): string {
  if (isAdmin) return ADMIN_DISPLAY_NAME
  const name = user.displayName?.trim()
  if (name) return name
  const local = user.email?.split('@')[0]?.trim()
  return local || 'Player'
}

export function getInitials(name: string, isAdmin: boolean): string {
  if (isAdmin) return ADMIN_INITIALS
  const words = name.split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2)
  return letters.toUpperCase() || '?'
}
