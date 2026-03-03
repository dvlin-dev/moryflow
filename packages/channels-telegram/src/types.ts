/**
 * [DEFINES]: Telegram 渠道运行时类型与配置模型
 * [USED_BY]: telegram-runtime/config/pc main 装配层
 * [POS]: Telegram 适配层类型入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type {
  ChannelPolicyConfig,
  InboundEnvelope,
  OutboundEnvelope,
  PairingRequest,
  SafeWatermarkRepository,
  SessionRepository,
  SentMessageRepository,
  PairingRepository,
  ThreadResolution,
} from '@moryflow/channels-core';

export type TelegramRuntimeMode = 'polling' | 'webhook';

export type TelegramWebhookConfig = {
  url: string;
  secret: string;
};

export type TelegramPollingConfig = {
  timeoutSeconds: number;
  idleDelayMs: number;
  maxBatchSize: number;
};

export type TelegramAccountConfig = {
  accountId: string;
  botToken: string;
  mode: TelegramRuntimeMode;
  webhook?: TelegramWebhookConfig;
  polling: TelegramPollingConfig;
  policy: ChannelPolicyConfig;
  pairingCodeTtlSeconds: number;
  maxSendRetries: number;
};

export type TelegramRuntimePorts = {
  offsets: SafeWatermarkRepository;
  sessions: SessionRepository;
  sentMessages: SentMessageRepository;
  pairing: PairingRepository;
};

export type TelegramInboundDispatch = {
  envelope: InboundEnvelope;
  thread: ThreadResolution;
};

export type TelegramRuntimeEvents = {
  onInbound: (dispatch: TelegramInboundDispatch) => Promise<void>;
  onPairingRequired?: (request: PairingRequest) => Promise<void>;
  onStatusChange?: (status: TelegramRuntimeStatus) => void;
};

export type TelegramRuntimeLogger = {
  info?: (message: string, detail?: Record<string, unknown>) => void;
  warn?: (message: string, detail?: Record<string, unknown>) => void;
  error?: (message: string, detail?: Record<string, unknown>) => void;
};

export type TelegramRuntimeStatus = {
  accountId: string;
  mode: TelegramRuntimeMode;
  running: boolean;
  lastError?: string;
  lastUpdateAt?: string;
};

export type TelegramSendResult = {
  ok: boolean;
  chatId: string;
  messageId?: string;
  usedFallback?: 'threadless' | 'plaintext' | null;
};

export type TelegramRuntime = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  send: (envelope: OutboundEnvelope) => Promise<TelegramSendResult>;
  getStatus: () => TelegramRuntimeStatus;
  handleWebhookUpdate: (rawUpdate: unknown) => Promise<void>;
};
