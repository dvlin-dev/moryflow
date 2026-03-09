/**
 * [DEFINES]: telegramFormSchema, FormValues, DM_POLICY_OPTIONS, GROUP_POLICY_OPTIONS, 工具函数
 * [USED_BY]: telegram-section.tsx 及其子组件、validation.test.ts
 * [POS]: Telegram 配置表单的 schema 单一事实源 + 类型派生 + 纯工具函数
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { z } from 'zod/v3';
import type { TelegramAccountSnapshot, TelegramRuntimeAccountStatus } from '@shared/ipc';

export const ALLOWED_PROXY_PROTOCOLS = new Set(['http:', 'https:', 'socks5:']);
export const DEFAULT_SURGE_PROXY_URL = 'http://127.0.0.1:6152';

export const DM_POLICY_OPTIONS = [
  { value: 'pairing', label: 'Approval required' },
  { value: 'allowlist', label: 'Specific users' },
  { value: 'open', label: 'Anyone' },
  { value: 'disabled', label: 'Nobody' },
] as const;

export const GROUP_POLICY_OPTIONS = [
  { value: 'allowlist', label: 'Allowlist' },
  { value: 'open', label: 'Open' },
  { value: 'disabled', label: 'Disabled' },
] as const;

export const telegramFormSchema = z
  .object({
    accountId: z.string().min(1),
    enabled: z.boolean(),
    mode: z.enum(['polling', 'webhook']),
    hasStoredBotToken: z.boolean(),
    hasStoredWebhookSecret: z.boolean(),
    hasStoredProxyUrl: z.boolean(),
    botToken: z.string(),
    webhookUrl: z.string(),
    webhookSecret: z.string(),
    proxyEnabled: z.boolean(),
    proxyUrl: z.string(),
    webhookListenHost: z.string(),
    webhookListenPort: z.coerce.number().min(1).max(65535),
    dmPolicy: z.enum(['pairing', 'allowlist', 'open', 'disabled']),
    allowFromText: z.string(),
    groupPolicy: z.enum(['allowlist', 'open', 'disabled']),
    groupAllowFromText: z.string(),
    requireMentionByDefault: z.boolean(),
    pollingTimeoutSeconds: z.coerce.number().min(5).max(60),
    pollingIdleDelayMs: z.coerce.number().min(100).max(5000),
    pollingMaxBatchSize: z.coerce.number().min(1).max(100),
    pairingCodeTtlSeconds: z.coerce.number().min(60).max(86400),
    maxSendRetries: z.coerce.number().min(1).max(8),
    enableDraftStreaming: z.boolean(),
    draftFlushIntervalMs: z.coerce.number().min(200).max(2000),
  })
  .superRefine((values, ctx) => {
    if (values.enabled && !values.botToken.trim() && !values.hasStoredBotToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['botToken'],
        message: 'Bot token is required when channel is enabled.',
      });
    }

    const proxyUrl = values.proxyUrl.trim();
    if (values.proxyEnabled && !proxyUrl && !values.hasStoredProxyUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proxyUrl'],
        message: 'Proxy URL is required when proxy is enabled.',
      });
    }

    if (proxyUrl) {
      try {
        const parsed = new URL(proxyUrl);
        if (!ALLOWED_PROXY_PROTOCOLS.has(parsed.protocol)) {
          throw new Error('unsupported protocol');
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['proxyUrl'],
          message: 'Proxy URL must be a valid http/https/socks5 URL.',
        });
      }
    }

    if (values.mode !== 'webhook') {
      return;
    }

    const webhookUrl = values.webhookUrl.trim();
    if (!webhookUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['webhookUrl'],
        message: 'Webhook URL is required in webhook mode.',
      });
    } else {
      try {
        const parsed = new URL(webhookUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error('unsupported protocol');
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['webhookUrl'],
          message: 'Webhook URL must be a valid http/https URL.',
        });
      }
    }

    if (!values.webhookSecret.trim() && !values.hasStoredWebhookSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['webhookSecret'],
        message: 'Webhook secret is required in webhook mode.',
      });
    }
  });

export type FormValues = z.infer<typeof telegramFormSchema>;

export const parseListText = (value: string): string[] => {
  return Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  );
};

export const toFormValues = (account: TelegramAccountSnapshot): FormValues => ({
  accountId: account.accountId,
  enabled: account.enabled,
  mode: account.mode,
  hasStoredBotToken: account.hasBotToken,
  hasStoredWebhookSecret: account.hasWebhookSecret,
  hasStoredProxyUrl: account.hasProxyUrl,
  botToken: account.botTokenEcho ?? '',
  webhookUrl: account.webhookUrl ?? '',
  webhookSecret: '',
  proxyEnabled: account.proxyEnabled,
  proxyUrl: account.proxyUrl?.trim() || (account.hasProxyUrl ? '' : DEFAULT_SURGE_PROXY_URL),
  webhookListenHost: account.webhookListenHost,
  webhookListenPort: account.webhookListenPort,
  dmPolicy: account.dmPolicy,
  allowFromText: account.allowFrom.join('\n'),
  groupPolicy: account.groupPolicy,
  groupAllowFromText: account.groupAllowFrom.join('\n'),
  requireMentionByDefault: account.requireMentionByDefault,
  pollingTimeoutSeconds: account.pollingTimeoutSeconds,
  pollingIdleDelayMs: account.pollingIdleDelayMs,
  pollingMaxBatchSize: account.pollingMaxBatchSize,
  pairingCodeTtlSeconds: account.pairingCodeTtlSeconds,
  maxSendRetries: account.maxSendRetries,
  enableDraftStreaming: account.enableDraftStreaming,
  draftFlushIntervalMs: account.draftFlushIntervalMs,
});

export const statusLabel = (
  status: TelegramRuntimeAccountStatus | null
): {
  text: string;
  tone: 'default' | 'secondary' | 'destructive' | 'outline';
} => {
  if (!status) {
    return { text: 'Not connected', tone: 'outline' };
  }
  if (!status.enabled) {
    return { text: 'Disabled', tone: 'outline' };
  }
  if (!status.hasBotToken) {
    return { text: 'Missing token', tone: 'destructive' };
  }
  if (status.running) {
    return { text: 'Running', tone: 'default' };
  }
  return { text: 'Stopped', tone: 'secondary' };
};

export const hasRuntimeStartFailure = (status: TelegramRuntimeAccountStatus | null): boolean => {
  if (!status) {
    return false;
  }
  return (
    status.enabled && status.hasBotToken && !status.running && Boolean(status.lastError?.trim())
  );
};
