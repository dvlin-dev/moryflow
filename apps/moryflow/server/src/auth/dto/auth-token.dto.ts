/**
 * [DEFINES]: Auth token 请求 DTO（refresh/logout）
 * [USED_BY]: auth.tokens.controller.ts
 * [POS]: Auth Token 请求参数校验
 */

import { z } from 'zod';

export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().trim().min(20),
  })
  .strict();

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

export const logoutSchema = z
  .object({
    refreshToken: z.string().trim().min(20),
  })
  .strict();

export type LogoutDto = z.infer<typeof logoutSchema>;
