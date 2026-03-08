/**
 * [DEFINES]: Auth Social 交换请求 DTO
 * [USED_BY]: auth-social.controller.ts
 * [POS]: OAuth bridge exchange 输入校验
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { z } from 'zod';

export const authSocialExchangeSchema = z
  .object({
    code: z.string().trim().min(1),
    nonce: z.string().trim().min(1),
  })
  .strict();

export type AuthSocialExchangeDto = z.infer<typeof authSocialExchangeSchema>;
