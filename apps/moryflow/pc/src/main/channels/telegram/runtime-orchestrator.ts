/**
 * [INPUT]: Telegram 账号配置集合 + secret/persistence 依赖
 * [OUTPUT]: runtime 生命周期管理（start/stop/status/webhook ingress）
 * [POS]: Telegram runtime orchestration 边界
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import {
  createTelegramRuntime,
  parseTelegramAccountConfig,
  type TelegramRuntime,
} from '@moryflow/channels-telegram';
import path from 'node:path';
import type { UIMessage } from 'ai';
import type { OutboundEnvelope } from '@moryflow/channels-core';
import {
  getTelegramBotToken,
  getTelegramProxyUrl,
  getTelegramWebhookSecret,
} from './secret-store.js';
import { getTelegramPersistenceStore } from './sqlite-store.js';
import {
  startTelegramWebhookIngress,
  type TelegramWebhookIngressRoute,
  type TelegramWebhookIngressHandle,
} from './webhook-ingress.js';
import {
  createTelegramInboundReplyHandler,
  createTelegramPairingReminderHandler,
} from './inbound-reply-service.js';
import { createTelegramConversationService } from './conversation-service.js';
import { chatSessionStore } from '../../chat-session-store/index.js';
import { agentHistoryToUiMessages } from '../../chat-session-store/ui-message.js';
import { sanitizePersistedUiMessages } from '../../chat/ui-message-sanitizer.js';
import { broadcastMessageEvent, broadcastSessionEvent } from '../../chat/broadcast.js';
import { getStoredVault } from '../../vault.js';
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

type WebhookIngressBinding = {
  ingressKey: string;
  listenHost: string;
  listenPort: number;
  route: TelegramWebhookIngressRoute;
};

const normalizeWebhookListenHost = (host?: string): string => host?.trim() || '127.0.0.1';
const normalizeWebhookListenPort = (port?: number): number =>
  Number.isInteger(port) ? Number(port) : 8787;
const buildWebhookIngressKey = (listenHost: string, listenPort: number): string =>
  `${listenHost}:${listenPort}`;

const extractMessageText = (message: UIMessage): string => {
  return (message.parts ?? [])
    .map((part) => {
      if (part.type !== 'text') {
        return '';
      }
      return part.text;
    })
    .join('')
    .trim();
};

const hasTrailingUserMessage = (messages: UIMessage[], userInput: string): boolean => {
  if (messages.length === 0) {
    return false;
  }
  const last = messages[messages.length - 1];
  if (last?.role !== 'user') {
    return false;
  }
  return extractMessageText(last) === userInput.trim();
};

const buildTelegramRealtimePreviewMessages = (input: {
  baseMessages: UIMessage[];
  conversationId: string;
  streamId: string;
  userInput: string;
  assistantText: string;
}): UIMessage[] => {
  const next = [...input.baseMessages];
  const normalizedUserInput = input.userInput.trim();
  if (normalizedUserInput && !hasTrailingUserMessage(next, normalizedUserInput)) {
    next.push({
      id: `${input.conversationId}:telegram-live-user:${input.streamId}`,
      role: 'user',
      parts: [{ type: 'text', text: normalizedUserInput }],
    });
  }
  const normalizedAssistantText = input.assistantText.trim();
  if (normalizedAssistantText) {
    next.push({
      id: `${input.conversationId}:telegram-live-assistant:${input.streamId}`,
      role: 'assistant',
      parts: [{ type: 'text', text: normalizedAssistantText }],
    });
  }
  return next;
};

const isTextLikePart = (part: UIMessage['parts'][number]): boolean => {
  return part.type === 'text' || part.type === 'reasoning';
};

const buildTextSignature = (message: UIMessage): string => {
  return (message.parts ?? [])
    .filter(isTextLikePart)
    .map((part) => {
      const text = 'text' in part && typeof part.text === 'string' ? part.text : '';
      if (part.type === 'reasoning') {
        return `reasoning:${text}`;
      }
      return `text:${text}`;
    })
    .join('\n');
};

const mergeUiMessagesPreservingRichParts = (input: {
  existingMessages: UIMessage[];
  rebuiltMessages: UIMessage[];
}): UIMessage[] => {
  return input.rebuiltMessages.map((rebuilt, index) => {
    const existing = input.existingMessages[index];
    if (!existing || existing.role !== rebuilt.role) {
      return rebuilt;
    }
    if (buildTextSignature(existing) !== buildTextSignature(rebuilt)) {
      return rebuilt;
    }

    const richParts = (existing.parts ?? []).filter((part) => !isTextLikePart(part));
    if (richParts.length === 0) {
      return {
        ...rebuilt,
        id: existing.id,
      };
    }
    return {
      ...rebuilt,
      id: existing.id,
      parts: [...rebuilt.parts, ...richParts],
    };
  });
};

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

  const stopAllWebhookIngresses = async (): Promise<void> => {
    for (const [ingressKey, ingress] of Array.from(webhookIngresses.entries())) {
      webhookIngresses.delete(ingressKey);
      try {
        await ingress.stop();
      } catch (error) {
        console.warn('[telegram-channel] failed to stop webhook ingress', {
          ingressKey,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  const startAccountRuntime = async (
    account: TelegramAccountSettings
  ): Promise<WebhookIngressBinding | null> => {
    const accountId = account.accountId;
    const existing = runtimes.get(accountId);
    if (existing) {
      await existing.stop();
      runtimes.delete(accountId);
    }

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
      return null;
    }

    const webhookSecret = await getTelegramWebhookSecret(accountId);
    const proxyUrl = account.proxyEnabled ? await getTelegramProxyUrl(accountId) : null;
    const parsed = parseTelegramAccountConfig({
      accountId,
      botToken,
      mode: account.mode,
      proxy: {
        enabled: account.proxyEnabled,
        url: proxyUrl ?? undefined,
      },
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
    const conversationService = createTelegramConversationService({
      accountId,
      bindings: persistence.conversationBindings,
      sessions: {
        createSession: (input) => {
          return chatSessionStore.create({
            vaultPath: input.vaultPath,
          });
        },
        deleteSession: (conversationId) => {
          chatSessionStore.delete(conversationId);
        },
        getSessionSummary: (conversationId) => {
          return chatSessionStore.getSummary(conversationId);
        },
      },
      resolveVaultPath: async () => {
        const vault = await getStoredVault();
        if (!vault?.path) {
          throw new Error('No workspace selected. Please select a workspace first.');
        }
        const workspacePath = vault.path.trim();
        if (!path.isAbsolute(workspacePath)) {
          throw new Error('Workspace path is invalid. Please reselect your workspace.');
        }
        return workspacePath;
      },
    });
    const syncConversationUiState = async (conversationId: string): Promise<void> => {
      const history = chatSessionStore.getHistory(conversationId);
      const rebuiltMessages = sanitizePersistedUiMessages(
        agentHistoryToUiMessages(conversationId, history)
      );
      const existingMessages = sanitizePersistedUiMessages(
        chatSessionStore.getUiMessages(conversationId)
      );
      const uiMessages = mergeUiMessagesPreservingRichParts({
        existingMessages,
        rebuiltMessages,
      });
      const summary = chatSessionStore.updateSessionMeta(conversationId, {
        uiMessages,
      });
      broadcastSessionEvent({ type: 'updated', session: summary });
      broadcastMessageEvent({
        type: 'snapshot',
        sessionId: conversationId,
        messages: uiMessages,
        persisted: true,
      });
    };
    const publishConversationPreview = (preview: {
      conversationId: string;
      streamId: string;
      userInput: string;
      assistantText: string;
    }): void => {
      const baseMessages = sanitizePersistedUiMessages(
        chatSessionStore.getUiMessages(preview.conversationId)
      );
      const previewMessages = buildTelegramRealtimePreviewMessages({
        baseMessages,
        conversationId: preview.conversationId,
        streamId: preview.streamId,
        userInput: preview.userInput,
        assistantText: preview.assistantText,
      });
      broadcastMessageEvent({
        type: 'snapshot',
        sessionId: preview.conversationId,
        messages: previewMessages,
        persisted: false,
      });
    };
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
        sentMessages: persistence.sentMessages,
        pairing: persistence.pairing,
      },
      events: {
        onInbound: createTelegramInboundReplyHandler({
          accountId,
          sendEnvelope,
          resolveConversationId: (thread) => conversationService.ensureConversationId(thread),
          createNewConversationId: (thread) => conversationService.createNewConversationId(thread),
          resolveAgentOptions: (conversationId) => {
            const summary = chatSessionStore.getSummary(conversationId);
            return {
              preferredModelId: summary.preferredModelId,
              thinking: summary.thinking,
              thinkingProfile: summary.thinkingProfile,
            };
          },
          syncConversationUiState,
          publishConversationPreview,
          enableDraftStreaming: account.enableDraftStreaming,
          draftFlushIntervalMs: account.draftFlushIntervalMs,
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
    await runtime.start();

    runtimes.set(accountId, runtime);

    if (parsed.mode !== 'webhook' || !parsed.webhook) {
      return null;
    }

    const webhookPath = parseWebhookPathFromUrl(parsed.webhook.url);
    const listenHost = normalizeWebhookListenHost(account.webhookListenHost);
    const listenPort = normalizeWebhookListenPort(account.webhookListenPort);
    return {
      ingressKey: buildWebhookIngressKey(listenHost, listenPort),
      listenHost,
      listenPort,
      route: {
        accountId,
        webhookPath,
        webhookSecret: parsed.webhook.secret,
        onUpdate: async (update) => {
          await runtime.handleWebhookUpdate(update);
        },
      },
    };
  };

  const applyAccounts = async (
    accounts: Record<string, TelegramAccountSettings>
  ): Promise<void> => {
    await stopAllWebhookIngresses();

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

    const webhookBindingsByIngress = new Map<
      string,
      {
        listenHost: string;
        listenPort: number;
        routes: TelegramWebhookIngressRoute[];
        accounts: TelegramAccountSettings[];
      }
    >();

    for (const account of Object.values(accounts)) {
      try {
        const webhookBinding = await startAccountRuntime(account);
        if (webhookBinding) {
          const group = webhookBindingsByIngress.get(webhookBinding.ingressKey) ?? {
            listenHost: webhookBinding.listenHost,
            listenPort: webhookBinding.listenPort,
            routes: [],
            accounts: [],
          };
          group.routes.push(webhookBinding.route);
          group.accounts.push(account);
          webhookBindingsByIngress.set(webhookBinding.ingressKey, group);
        }
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

    for (const [ingressKey, group] of webhookBindingsByIngress.entries()) {
      try {
        const ingress = await startTelegramWebhookIngress({
          listenHost: group.listenHost,
          listenPort: group.listenPort,
          routes: group.routes,
        });
        webhookIngresses.set(ingressKey, ingress);
      } catch (error) {
        const lastError = error instanceof Error ? error.message : String(error);
        for (const account of group.accounts) {
          const runtime = runtimes.get(account.accountId);
          if (runtime) {
            runtimes.delete(account.accountId);
            try {
              await runtime.stop();
            } catch (stopError) {
              console.warn(
                '[telegram-channel] failed to stop runtime after ingress startup error',
                {
                  accountId: account.accountId,
                  error: stopError instanceof Error ? stopError.message : String(stopError),
                }
              );
            }
          }
          setStatus(
            createRuntimeStatus({
              accountId: account.accountId,
              mode: account.mode,
              enabled: account.enabled,
              hasBotToken: true,
              running: false,
              lastError,
            })
          );
        }
      }
    }
  };

  const shutdown = async (): Promise<void> => {
    await stopAllWebhookIngresses();
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
