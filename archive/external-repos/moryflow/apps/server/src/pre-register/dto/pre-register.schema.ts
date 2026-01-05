/**
 * [DEFINES]: SendOtpDto, VerifyDto - 预注册请求 DTO
 * [USED_BY]: PreRegisterController, PreRegisterService
 * [POS]: 预注册模块请求验证
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { z } from 'zod';

/**
 * 发送预注册验证码请求
 */
export const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(50, 'Name is too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
});

export type SendOtpDto = z.infer<typeof sendOtpSchema>;

/**
 * 验证 OTP 并完成注册请求
 */
export const verifySchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'Verification code must be 6 digits'),
});

export type VerifyDto = z.infer<typeof verifySchema>;
