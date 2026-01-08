/**
 * [DEFINES]: Auth Facade API 的 Zod schemas 和 DTO 类型
 * [USED_BY]: auth-facade.controller.ts, auth-facade.service.ts
 * [POS]: auth-server 包的 DTO 定义
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import { z } from 'zod';

// ========== 注册 ==========

export const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const RegisterResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
  }),
  next: z.literal('VERIFY_EMAIL_OTP'),
});

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

// ========== 验证邮箱 OTP ==========

export const VerifyEmailOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export type VerifyEmailOTPInput = z.infer<typeof VerifyEmailOTPSchema>;

// ========== 登录 ==========

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ========== 通用认证响应 ==========

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(), // 仅 native 返回
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
    emailVerified: z.boolean(),
    tier: z.enum(['FREE', 'STARTER', 'PRO', 'MAX']),
    isAdmin: z.boolean(),
  }),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// ========== OAuth 登录（Google/Apple） ==========

export const GoogleStartSchema = z.object({
  callbackURL: z.string().url('Invalid callback URL').optional(),
});

export type GoogleStartInput = z.infer<typeof GoogleStartSchema>;

export const GoogleStartResponseSchema = z.object({
  url: z.string().url(),
});

export type GoogleStartResponse = z.infer<typeof GoogleStartResponseSchema>;

export const GoogleTokenSchema = z.object({
  idToken: z.string().min(1, 'ID token is required'),
});

export type GoogleTokenInput = z.infer<typeof GoogleTokenSchema>;

export const AppleStartSchema = z.object({
  callbackURL: z.string().url('Invalid callback URL').optional(),
});

export type AppleStartInput = z.infer<typeof AppleStartSchema>;

export const AppleStartResponseSchema = z.object({
  url: z.string().url(),
});

export type AppleStartResponse = z.infer<typeof AppleStartResponseSchema>;

export const AppleTokenSchema = z.object({
  idToken: z.string().min(1, 'ID token is required'),
});

export type AppleTokenInput = z.infer<typeof AppleTokenSchema>;

// ========== Refresh ==========

// refresh 不需要 body，从 cookie 或 header 读取 token

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(), // 仅 native 返回（rotation）
});

export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

// ========== Me ==========

export const MeResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable().optional(),
  emailVerified: z.boolean(),
  tier: z.enum(['FREE', 'STARTER', 'PRO', 'MAX']),
  creditBalance: z.number(),
  isAdmin: z.boolean(),
  profile: z
    .object({
      nickname: z.string().nullable(),
      avatar: z.string().nullable(),
      locale: z.string(),
      timezone: z.string(),
    })
    .nullable(),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;

// ========== 错误响应 ==========

export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  next: z.string().optional(), // 下一步操作指示
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
