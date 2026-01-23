/**
 * 认证相关的 Zod 验证模式
 */
import { z } from 'zod/v3';

// 登录表单验证
export const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少 6 个字符'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
