/**
 * [DEFINES]: Telegram 渠道 IPC 类型（settings/status/pairing）
 * [USED_BY]: preload, renderer settings, main ipc handlers
 * [POS]: PC Telegram IPC 契约事实源
 * [UPDATE]: 2026-03-04 - settings snapshot 新增 botTokenEcho/proxyUrl 回显字段（Bot Token 密文回显、Proxy URL 明文回显）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type TelegramAccountMode = 'polling' | 'webhook';
export type TelegramDmPolicy = 'pairing' | 'allowlist' | 'open' | 'disabled';
export type TelegramGroupPolicy = 'allowlist' | 'open' | 'disabled';

export type TelegramGroupTopicRule = {
  requireMention?: boolean;
};

export type TelegramGroupRule = {
  requireMention?: boolean;
  topics?: Record<string, TelegramGroupTopicRule>;
};

export type TelegramAccountSnapshot = {
  accountId: string;
  enabled: boolean;
  mode: TelegramAccountMode;
  proxyEnabled: boolean;
  webhookUrl?: string;
  webhookListenHost: string;
  webhookListenPort: number;
  dmPolicy: TelegramDmPolicy;
  allowFrom: string[];
  groupPolicy: TelegramGroupPolicy;
  groupAllowFrom: string[];
  requireMentionByDefault: boolean;
  groups?: Record<string, TelegramGroupRule>;
  pollingTimeoutSeconds: number;
  pollingIdleDelayMs: number;
  pollingMaxBatchSize: number;
  pairingCodeTtlSeconds: number;
  maxSendRetries: number;
  enableDraftStreaming: boolean;
  draftFlushIntervalMs: number;
  hasBotToken: boolean;
  hasWebhookSecret: boolean;
  hasProxyUrl: boolean;
  botTokenEcho?: string;
  proxyUrl?: string;
};

export type TelegramSettingsSnapshot = {
  defaultAccountId: string;
  accounts: Record<string, TelegramAccountSnapshot>;
};

export type TelegramSettingsUpdateInput = {
  defaultAccountId?: string;
  account: {
    accountId: string;
    enabled?: boolean;
    mode?: TelegramAccountMode;
    proxyEnabled?: boolean;
    webhookUrl?: string;
    webhookListenHost?: string;
    webhookListenPort?: number;
    botToken?: string | null;
    webhookSecret?: string | null;
    proxyUrl?: string | null;
    dmPolicy?: TelegramDmPolicy;
    allowFrom?: string[];
    groupPolicy?: TelegramGroupPolicy;
    groupAllowFrom?: string[];
    requireMentionByDefault?: boolean;
    groups?: Record<string, TelegramGroupRule>;
    pollingTimeoutSeconds?: number;
    pollingIdleDelayMs?: number;
    pollingMaxBatchSize?: number;
    pairingCodeTtlSeconds?: number;
    maxSendRetries?: number;
    enableDraftStreaming?: boolean;
    draftFlushIntervalMs?: number;
  };
};

export type TelegramRuntimeAccountStatus = {
  accountId: string;
  mode: TelegramAccountMode;
  enabled: boolean;
  hasBotToken: boolean;
  running: boolean;
  lastError?: string;
  lastUpdateAt?: string;
};

export type TelegramRuntimeStatusSnapshot = {
  accounts: Record<string, TelegramRuntimeAccountStatus>;
};

export type TelegramPairingRequestItem = {
  id: string;
  accountId: string;
  senderId: string;
  peerId: string;
  code: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
  meta?: Record<string, unknown>;
};

export type TelegramProxyTestInput = {
  accountId: string;
  proxyEnabled?: boolean;
  proxyUrl?: string;
};

export type TelegramProxyTestResult = {
  ok: boolean;
  message: string;
  statusCode?: number;
  elapsedMs: number;
};
