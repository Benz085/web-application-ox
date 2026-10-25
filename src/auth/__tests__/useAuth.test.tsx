import '@/web-app-ox/test/setup'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { makeAuth } from '@/web-app-ox/test/render'
import { AuthContext } from '@/web-app-ox/auth/authContextValue'
import { useAuth } from '@/web-app-ox/auth/useAuth'

describe('useAuth', () => {
  it('returns the context value', () => {
    const value = makeAuth()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current).toBe(value)
  })

  it('throws outside <AuthProvider>', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside <AuthProvider>')
  })
})
