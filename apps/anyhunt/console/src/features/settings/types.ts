/**
 * Settings 类型定义
 */

export interface UserQuota {
  monthlyLimit: number
  monthlyUsed: number
  monthlyRemaining: number
  purchasedQuota: number
  periodEndAt: string
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  tier: string
  isAdmin: boolean
  quota: UserQuota | null
  createdAt: string
}

export interface UpdateProfileRequest {
  name?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
