/**
 * [DEFINES]: Auth Social 交换请求 DTO
 * [USED_BY]: auth-social.controller.ts
 * [POS]: OAuth bridge exchange 输入校验
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { z } from 'zod';

export const authSocialExchangeSchema = z
  .object({
    code: z.string().trim().min(1),
    nonce: z.string().trim().min(1),
  })
  .strict();

export type AuthSocialExchangeDto = z.infer<typeof authSocialExchangeSchema>;
