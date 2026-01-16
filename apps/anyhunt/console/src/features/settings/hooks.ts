/**
 * Settings React Query hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProfile, updateProfile, changePassword } from './api'
import type { UpdateProfileRequest, ChangePasswordRequest } from './types'

export const settingsKeys = {
  all: ['settings'] as const,
  profile: () => [...settingsKeys.all, 'profile'] as const,
}

/**
 * 获取用户资料
 */
export function useProfile() {
  return useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: getProfile,
  })
}

/**
 * 更新用户资料
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile() })
    },
  })
}

/**
 * 修改密码
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => changePassword(data),
  })
}
