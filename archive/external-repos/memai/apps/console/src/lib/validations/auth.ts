/**
 * 认证相关的 Zod 验证模式
 */
import { z } from 'zod'

// 登录表单验证
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginFormData = z.infer<typeof loginSchema>
