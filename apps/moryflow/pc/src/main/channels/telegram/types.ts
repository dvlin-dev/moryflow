/**
 * [DEFINES]: Telegram 渠道主进程域模型（配置/状态/审批）
 * [USED_BY]: service.ts, ipc handlers, shared ipc types
 * [POS]: PC Telegram 集成主进程类型事实源
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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

export type TelegramAccountSettings = {
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
};

export type TelegramSettingsStore = {
  defaultAccountId: string;
  accounts: Record<string, TelegramAccountSettings>;
};

export type TelegramAccountSnapshot = TelegramAccountSettings & {
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
  account: Partial<TelegramAccountSettings> & {
    accountId: string;
    botToken?: string | null;
    webhookSecret?: string | null;
    proxyUrl?: string | null;
  };
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

export type TelegramProxySuggestionInput = {
  accountId: string;
};

export type TelegramProxySuggestionReason =
  | 'direct_reachable'
  | 'proxy_candidate_reachable'
  | 'proxy_candidate_unreachable'
  | 'no_proxy_candidate';

export type TelegramProxySuggestionResult = {
  proxyEnabled: boolean;
  proxyUrl?: string;
  reason: TelegramProxySuggestionReason;
  message: string;
  candidates: string[];
};

export type TelegramRuntimeAccountStatus = {
  accountId: string;
  mode: TelegramAccountMode;
  running: boolean;
  enabled: boolean;
  hasBotToken: boolean;
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
