/**
 * Settings API
 */
import { apiClient } from '@/lib/api-client'
import { USER_API } from '@/lib/api-paths'
import type { UserProfile, UpdateProfileRequest, ChangePasswordRequest } from './types'

/**
 * 获取用户资料
 */
export async function getProfile(): Promise<UserProfile> {
  return apiClient.get<UserProfile>(USER_API.ME)
}

/**
 * 更新用户资料
 */
export async function updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
  return apiClient.patch<UserProfile>(USER_API.ME, data)
}

/**
 * 修改密码
 */
export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  await apiClient.post(`${USER_API.ME}/password`, data)
}
