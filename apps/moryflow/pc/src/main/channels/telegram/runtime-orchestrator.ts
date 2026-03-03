/**
 * [INPUT]: Telegram 账号配置集合 + secret/persistence 依赖
 * [OUTPUT]: runtime 生命周期管理（start/stop/status/webhook ingress）
 * [POS]: Telegram runtime orchestration 边界
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  createTelegramRuntime,
  parseTelegramAccountConfig,
  type TelegramRuntime,
} from '@moryflow/channels-telegram';
import type { OutboundEnvelope } from '@moryflow/channels-core';
import { getTelegramBotToken, getTelegramWebhookSecret } from './secret-store.js';
import { getTelegramPersistenceStore } from './sqlite-store.js';
import {
  startTelegramWebhookIngress,
  type TelegramWebhookIngressHandle,
} from './webhook-ingress.js';
import {
  createTelegramInboundReplyHandler,
  createTelegramPairingReminderHandler,
} from './inbound-reply-service.js';
import type {
  TelegramAccountSettings,
  TelegramRuntimeAccountStatus,
  TelegramRuntimeStatusSnapshot,
} from './types.js';

const parseWebhookPathFromUrl = (webhookUrl: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(webhookUrl);
  } catch {
    throw new Error('Webhook URL is invalid.');
  }
  const path = parsed.pathname?.trim();
  if (!path) {
    return '/';
  }
  return path.startsWith('/') ? path : `/${path}`;
};

const createRuntimeStatus = (input: {
  accountId: string;
  mode: TelegramAccountSettings['mode'];
  enabled: boolean;
  hasBotToken: boolean;
  running: boolean;
  lastError?: string;
  lastUpdateAt?: string;
}): TelegramRuntimeAccountStatus => ({
  accountId: input.accountId,
  mode: input.mode,
  enabled: input.enabled,
  hasBotToken: input.hasBotToken,
  running: input.running,
  lastError: input.lastError,
  lastUpdateAt: input.lastUpdateAt,
});

export type TelegramRuntimeOrchestrator = {
  applyAccounts: (accounts: Record<string, TelegramAccountSettings>) => Promise<void>;
  shutdown: () => Promise<void>;
  getStatusSnapshot: () => TelegramRuntimeStatusSnapshot;
  subscribeStatus: (listener: (status: TelegramRuntimeStatusSnapshot) => void) => () => void;
};

export const createTelegramRuntimeOrchestrator = (): TelegramRuntimeOrchestrator => {
  const runtimes = new Map<string, TelegramRuntime>();
  const webhookIngresses = new Map<string, TelegramWebhookIngressHandle>();
  const statuses = new Map<string, TelegramRuntimeAccountStatus>();
  const statusListeners = new Set<(status: TelegramRuntimeStatusSnapshot) => void>();

  const emitStatus = () => {
    const snapshot: TelegramRuntimeStatusSnapshot = {
      accounts: Object.fromEntries(statuses.entries()),
    };
    for (const listener of statusListeners) {
      listener(snapshot);
    }
  };

  const setStatus = (status: TelegramRuntimeAccountStatus) => {
    statuses.set(status.accountId, status);
    emitStatus();
  };

  const stopWebhookIngress = async (accountId: string): Promise<void> => {
    const ingress = webhookIngresses.get(accountId);
    if (!ingress) {
      return;
    }
    webhookIngresses.delete(accountId);
    try {
      await ingress.stop();
    } catch (error) {
      console.warn('[telegram-channel] failed to stop webhook ingress', {
        accountId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const startAccountRuntime = async (account: TelegramAccountSettings): Promise<void> => {
    const accountId = account.accountId;
    const existing = runtimes.get(accountId);
    if (existing) {
      await existing.stop();
      runtimes.delete(accountId);
    }
    await stopWebhookIngress(accountId);

    const botToken = await getTelegramBotToken(accountId);
    if (!account.enabled || !botToken) {
      setStatus(
        createRuntimeStatus({
          accountId,
          mode: account.mode,
          enabled: account.enabled,
          hasBotToken: Boolean(botToken),
          running: false,
          lastError: account.enabled ? 'Bot token is not configured.' : undefined,
        })
      );
      return;
    }

    const webhookSecret = await getTelegramWebhookSecret(accountId);
    const parsed = parseTelegramAccountConfig({
      accountId,
      botToken,
      mode: account.mode,
      webhook:
        account.mode === 'webhook'
          ? {
              url: account.webhookUrl,
              secret: webhookSecret,
            }
          : undefined,
      polling: {
        timeoutSeconds: account.pollingTimeoutSeconds,
        idleDelayMs: account.pollingIdleDelayMs,
        maxBatchSize: account.pollingMaxBatchSize,
      },
      policy: {
        dmPolicy: account.dmPolicy,
        allowFrom: account.allowFrom,
        groupPolicy: account.groupPolicy,
        groupAllowFrom: account.groupAllowFrom,
        requireMentionByDefault: account.requireMentionByDefault,
        groups: account.groups,
      },
      pairingCodeTtlSeconds: account.pairingCodeTtlSeconds,
      maxSendRetries: account.maxSendRetries,
    });

    const persistence = getTelegramPersistenceStore();
    let runtimeRef: TelegramRuntime | null = null;
    const sendEnvelope = async (envelope: OutboundEnvelope): Promise<void> => {
      if (!runtimeRef) {
        return;
      }
      await runtimeRef.send(envelope);
    };

    const runtime = createTelegramRuntime({
      config: parsed,
      ports: {
        offsets: persistence.offsets,
        sessions: persistence.sessions,
        sentMessages: persistence.sentMessages,
        pairing: persistence.pairing,
      },
      events: {
        onInbound: createTelegramInboundReplyHandler({
          accountId,
          sendEnvelope,
        }),
        onPairingRequired: createTelegramPairingReminderHandler({
          accountId,
          sendEnvelope,
        }),
        onStatusChange: (runtimeStatus) => {
          setStatus(
            createRuntimeStatus({
              accountId,
              mode: runtimeStatus.mode,
              enabled: account.enabled,
              hasBotToken: true,
              running: runtimeStatus.running,
              lastError: runtimeStatus.lastError,
              lastUpdateAt: runtimeStatus.lastUpdateAt,
            })
          );
        },
      },
      logger: {
        info: (message, detail) => {
          console.info('[telegram-channel]', message, detail ?? {});
        },
        warn: (message, detail) => {
          console.warn('[telegram-channel]', message, detail ?? {});
        },
        error: (message, detail) => {
          console.error('[telegram-channel]', message, detail ?? {});
        },
      },
    });

    runtimeRef = runtime;
    if (parsed.mode === 'webhook' && parsed.webhook) {
      const webhookIngress = await startTelegramWebhookIngress({
        accountId,
        webhookPath: parseWebhookPathFromUrl(parsed.webhook.url),
        webhookSecret: parsed.webhook.secret,
        listenHost: account.webhookListenHost,
        listenPort: account.webhookListenPort,
        onUpdate: async (update) => {
          await runtime.handleWebhookUpdate(update);
        },
      });
      webhookIngresses.set(accountId, webhookIngress);
    }

    try {
      await runtime.start();
    } catch (error) {
      await stopWebhookIngress(accountId);
      throw error;
    }

    runtimes.set(accountId, runtime);
  };

  const applyAccounts = async (
    accounts: Record<string, TelegramAccountSettings>
  ): Promise<void> => {
    for (const accountId of Array.from(webhookIngresses.keys())) {
      await stopWebhookIngress(accountId);
    }

    for (const runtime of runtimes.values()) {
      await runtime.stop();
    }
    runtimes.clear();

    const accountIds = new Set(Object.keys(accounts));
    let removedStatus = false;
    for (const accountId of Array.from(statuses.keys())) {
      if (!accountIds.has(accountId)) {
        statuses.delete(accountId);
        removedStatus = true;
      }
    }
    if (removedStatus) {
      emitStatus();
    }

    for (const account of Object.values(accounts)) {
      try {
        await startAccountRuntime(account);
      } catch (error) {
        const token = await getTelegramBotToken(account.accountId);
        setStatus(
          createRuntimeStatus({
            accountId: account.accountId,
            mode: account.mode,
            enabled: account.enabled,
            hasBotToken: Boolean(token),
            running: false,
            lastError: error instanceof Error ? error.message : String(error),
          })
        );
      }
    }
  };

  const shutdown = async (): Promise<void> => {
    for (const accountId of Array.from(webhookIngresses.keys())) {
      await stopWebhookIngress(accountId);
    }
    for (const runtime of runtimes.values()) {
      await runtime.stop();
    }
    runtimes.clear();
  };

  const getStatusSnapshot = (): TelegramRuntimeStatusSnapshot => {
    return {
      accounts: Object.fromEntries(statuses.entries()),
    };
  };

  const subscribeStatus = (
    listener: (status: TelegramRuntimeStatusSnapshot) => void
  ): (() => void) => {
    statusListeners.add(listener);
    listener(getStatusSnapshot());
    return () => {
      statusListeners.delete(listener);
    };
  };

  return {
    applyAccounts,
    shutdown,
    getStatusSnapshot,
    subscribeStatus,
  };
};
