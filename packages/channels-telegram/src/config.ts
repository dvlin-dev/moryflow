/**
 * [INPUT]: unknown Telegram account config
 * [OUTPUT]: TelegramAccountConfig（强校验 + 默认值）
 * [POS]: Telegram 运行时配置事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { z } from 'zod';
import type { TelegramAccountConfig } from './types';

const policySchema = z.object({
  dmPolicy: z.enum(['pairing', 'allowlist', 'open', 'disabled']).default('pairing'),
  allowFrom: z.array(z.string().min(1)).default([]),
  groupPolicy: z.enum(['allowlist', 'open', 'disabled']).default('allowlist'),
  groupAllowFrom: z.array(z.string().min(1)).default([]),
  requireMentionByDefault: z.boolean().default(true),
  groups: z
    .record(
      z.string(),
      z.object({
        requireMention: z.boolean().optional(),
        topics: z
          .record(
            z.string(),
            z.object({
              requireMention: z.boolean().optional(),
            })
          )
          .optional(),
      })
    )
    .optional(),
});

const proxySchema = z
  .object({
    enabled: z.boolean().default(false),
    url: z.string().trim().url().optional(),
  })
  .default({
    enabled: false,
  })
  .superRefine((value, ctx) => {
    if (!value.enabled) {
      return;
    }
    const proxyUrl = value.url?.trim();
    if (!proxyUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['url'],
        message: 'proxy url is required when proxy is enabled',
      });
      return;
    }
    try {
      const parsed = new URL(proxyUrl);
      if (
        parsed.protocol !== 'http:' &&
        parsed.protocol !== 'https:' &&
        parsed.protocol !== 'socks5:'
      ) {
        throw new Error('unsupported proxy protocol');
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['url'],
        message: 'proxy url must be a valid http/https/socks5 URL',
      });
    }
  });

const accountSchema = z
  .object({
    accountId: z.string().trim().min(1),
    botToken: z.string().trim().min(1),
    mode: z.enum(['polling', 'webhook']).default('polling'),
    proxy: proxySchema,
    webhook: z
      .object({
        url: z.string().trim().url(),
        secret: z.string().trim().min(1),
      })
      .optional(),
    polling: z
      .object({
        timeoutSeconds: z.number().int().min(5).max(60).default(25),
        idleDelayMs: z.number().int().min(100).max(5_000).default(600),
        maxBatchSize: z.number().int().min(1).max(100).default(100),
      })
      .default({
        timeoutSeconds: 25,
        idleDelayMs: 600,
        maxBatchSize: 100,
      }),
    policy: policySchema.default({
      dmPolicy: 'pairing',
      allowFrom: [],
      groupPolicy: 'allowlist',
      groupAllowFrom: [],
      requireMentionByDefault: true,
    }),
    pairingCodeTtlSeconds: z.number().int().min(60).max(86_400).default(900),
    maxSendRetries: z.number().int().min(1).max(8).default(3),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'webhook' && !value.webhook) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['webhook'],
        message: 'webhook config is required when mode=webhook',
      });
    }
  });

export const parseTelegramAccountConfig = (input: unknown): TelegramAccountConfig => {
  return accountSchema.parse(input);
};
