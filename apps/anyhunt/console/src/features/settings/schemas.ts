/**
 * [PROVIDES]: profile/security settings schemas + form defaults
 * [DEPENDS]: zod/v3
 * [POS]: Settings 表单校验规则（react-hook-form + zod）
 */
import { z } from 'zod/v3'

export const profileSettingsSchema = z.object({
  name: z.string().trim().max(100, 'Display name must be 100 characters or less'),
})

export type ProfileSettingsFormValues = z.infer<typeof profileSettingsSchema>

export const profileSettingsDefaults: ProfileSettingsFormValues = {
  name: '',
}

export const securitySettingsSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export type SecuritySettingsFormValues = z.infer<typeof securitySettingsSchema>

export const securitySettingsDefaults: SecuritySettingsFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

