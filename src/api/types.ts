import type { ApiError, Profile } from '../../shared/types'

export type { Profile }
export type ApiErrorBody = ApiError

export interface MeResponse {
  profile: Profile | null
  isAdmin: boolean
}
