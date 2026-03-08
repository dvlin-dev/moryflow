/**
 * [INPUT]: TelegramAccountConfig + runtime ports/events
 * [OUTPUT]: TelegramRuntime（polling/webhook/send）
 * [POS]: Telegram 渠道运行时核心（归一化、策略判定、可靠发送）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  classifyDeliveryFailure,
  computeRetryDelayMs,
  evaluateInboundPolicy,
  resolveThreadKey,
  shouldRetryDelivery,
  type OutboundMessageDelivery,
  type OutboundEnvelope,
} from '@moryflow/channels-core';
import { Bot, GrammyError } from 'grammy';
import type { Update, UserFromGetMe } from 'grammy/types';
import { ProxyAgent } from 'proxy-agent';
import { normalizeTelegramTarget } from './target';
import type {
  TelegramAccountConfig,
  TelegramRuntime,
  TelegramRuntimeEvents,
  TelegramRuntimeLogger,
  TelegramRuntimePorts,
  TelegramRuntimeStatus,
  TelegramSendResult,
} from './types';

const DEFAULT_ALLOWED_UPDATES: NonNullable<
  Parameters<Bot['api']['getUpdates']>[0]
>['allowed_updates'] = ['message', 'channel_post', 'callback_query', 'message_reaction'];
const DEFAULT_BOT_COMMANDS: Array<{ command: string; description: string }> = [
  { command: 'start', description: 'Initialize conversation' },
  { command: 'new', description: 'Start a new conversation' },
];
const MAX_POLLING_UPDATE_PROCESSING_RETRIES = 3;
const MAX_WEBHOOK_UPDATE_PROCESSING_RETRIES = 3;
const MAX_WEBHOOK_IN_MEMORY_DEDUP = 2048;
const MAX_TELEGRAM_PREVIEW_TEXT = 4_096;
const MAX_TELEGRAM_FINAL_TEXT = 3_800;
const MESSAGE_NOT_MODIFIED_PATTERN = /message is not modified|message_not_modified/i;

class TelegramUpdateProcessingError extends Error {
  readonly updateId: number;
  readonly causeError: unknown;

  constructor(updateId: number, causeError: unknown) {
    const causeText = causeError instanceof Error ? causeError.message : String(causeError);
    super(`failed to process update ${updateId}: ${causeText}`);
    this.name = 'TelegramUpdateProcessingError';
    this.updateId = updateId;
    this.causeError = causeError;
  }
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const stripHtmlTags = (value: string): string => {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const splitTelegramText = (text: string, chunkSize: number): string[] => {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }
  if (normalized.length <= chunkSize) {
    return [normalized];
  }
  const chunks: string[] = [];
  let offset = 0;
  while (offset < normalized.length) {
    chunks.push(normalized.slice(offset, offset + chunkSize));
    offset += chunkSize;
  }
  return chunks;
};

const isMessageNotModifiedError = (error: unknown): boolean => {
  const detail = toLogDetail(error);
  const text = [detail.description, detail.message]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  return MESSAGE_NOT_MODIFIED_PATTERN.test(text);
};

const toThreadId = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isPrivateChatTarget = (chatId: string): boolean => {
  const parsed = Number.parseInt(chatId, 10);
  if (!Number.isFinite(parsed)) {
    return false;
  }
  return parsed > 0;
};

const isValidDraftId = (draftId: number): boolean => {
  if (!Number.isInteger(draftId)) {
    return false;
  }
  if (draftId === 0) {
    return false;
  }
  return draftId >= -2_147_483_648 && draftId <= 2_147_483_647;
};

const isDraftApiUnsupportedError = (error: unknown): boolean => {
  const detail = toLogDetail(error);
  const errorWithMethod =
    typeof error === 'object' && error !== null ? (error as { method?: unknown }) : undefined;
  const method =
    typeof detail.method === 'string'
      ? detail.method
      : typeof errorWithMethod?.method === 'string'
        ? errorWithMethod.method
        : '';
  const descriptionAndMessage = [detail.description, detail.message]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase();
  const referencesDraftMethod =
    method.toLowerCase().includes('sendmessagedraft') ||
    descriptionAndMessage.includes('sendmessagedraft');
  if (!referencesDraftMethod) {
    return false;
  }
  if (
    descriptionAndMessage.includes('unknown method') ||
    descriptionAndMessage.includes('method not found') ||
    descriptionAndMessage.includes('not supported') ||
    descriptionAndMessage.includes('unsupported') ||
    descriptionAndMessage.includes('unavailable')
  ) {
    return true;
  }

  const errorCode = typeof detail.errorCode === 'number' ? detail.errorCode : undefined;
  if (errorCode === 404 && descriptionAndMessage.trim() === 'not found') {
    return true;
  }

  return false;
};

const isPreviewDelivery = (
  delivery: OutboundMessageDelivery | undefined
): delivery is Extract<OutboundMessageDelivery, { mode: 'preview' }> => {
  return delivery?.mode === 'preview';
};

const toLogDetail = (error: unknown): Record<string, unknown> => {
  if (error instanceof GrammyError) {
    return {
      errorCode: error.error_code,
      description: error.description,
      method: error.method,
    };
  }
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    error: String(error),
  };
};

const createPairingCode = (): string => {
  return String(100000 + Math.floor(Math.random() * 900000));
};

const toPairingRequestMeta = (update: Update): Record<string, unknown> => {
  if (update.message) {
    return {
      text: 'text' in update.message ? (update.message.text ?? '') : '',
      chatId: String(update.message.chat.id),
      messageId: String(update.message.message_id),
    };
  }
  if (update.callback_query) {
    return {
      callbackData: update.callback_query.data ?? '',
      messageId: update.callback_query.message
        ? String(update.callback_query.message.message_id)
        : undefined,
    };
  }
  return {};
};

export type CreateTelegramRuntimeInput = {
  config: TelegramAccountConfig;
  ports: TelegramRuntimePorts;
  events: TelegramRuntimeEvents;
  logger?: TelegramRuntimeLogger;
};

export const createTelegramRuntime = (input: CreateTelegramRuntimeInput): TelegramRuntime => {
  type ProxyAgentLike = {
    destroy?: () => void;
  };
  type PreviewTransport = 'draft' | 'message';
  type PreviewSession = {
    key: string;
    streamId: string;
    chatId: string;
    threadId?: number;
    transport: PreviewTransport;
    draftId?: number;
    previewMessageId?: number;
    lastRevision: number;
    lastText: string;
  };

  const proxyAgent: ProxyAgentLike | null =
    input.config.proxy.enabled && input.config.proxy.url
      ? new ProxyAgent({
          getProxyForUrl: () => input.config.proxy.url!,
        })
      : null;
  const bot = proxyAgent
    ? new Bot(input.config.botToken, {
        client: {
          baseFetchConfig: {
            agent: proxyAgent,
          },
        },
      } as any)
    : new Bot(input.config.botToken);
  const botApiWithDraft = bot.api as typeof bot.api & {
    sendMessageDraft?: (
      chatId: string,
      draftId: number,
      text: string,
      options?: {
        parse_mode?: 'HTML';
        disable_web_page_preview?: boolean;
      }
    ) => Promise<unknown>;
    setChatMenuButton?: (input: {
      menu_button: {
        type: string;
      };
    }) => Promise<unknown>;
  };
  let botIdentity: UserFromGetMe | null = null;
  let botIdentityLoading: Promise<void> | null = null;
  let pollingTask: Promise<void> | null = null;
  let stopping = false;
  let running = false;
  let draftApiUnavailable = false;
  const previewSessions = new Map<string, PreviewSession>();
  const processingWebhookUpdateIds = new Set<number>();
  const bufferedWebhookUpdateIds = new Set<number>();
  const processedWebhookUpdateIds = new Set<number>();
  const processedWebhookUpdateIdQueue: number[] = [];
  const pollingUpdateFailureCounts = new Map<number, number>();
  const webhookUpdateFailureCounts = new Map<number, number>();
  let webhookSafeWatermark: number | null = null;
  let webhookSafeWatermarkLoaded = false;

  let status: TelegramRuntimeStatus = {
    accountId: input.config.accountId,
    mode: input.config.mode,
    running: false,
  };

  const emitStatus = (patch: Partial<TelegramRuntimeStatus>) => {
    status = {
      ...status,
      ...patch,
      accountId: input.config.accountId,
      mode: input.config.mode,
    };
    input.events.onStatusChange?.(status);
  };

  const logInfo = (message: string, detail?: Record<string, unknown>) => {
    input.logger?.info?.(message, detail);
  };

  const logWarn = (message: string, detail?: Record<string, unknown>) => {
    input.logger?.warn?.(message, detail);
  };

  const logError = (message: string, error: unknown) => {
    input.logger?.error?.(message, toLogDetail(error));
  };

  const closeProxyAgent = async (): Promise<void> => {
    if (!proxyAgent) {
      return;
    }
    try {
      proxyAgent.destroy?.();
    } catch (error) {
      logWarn('telegram proxy agent close failed', toLogDetail(error));
    }
  };

  const ensureIdentity = async (): Promise<void> => {
    if (botIdentity) {
      return;
    }
    if (!botIdentityLoading) {
      botIdentityLoading = (async () => {
        botIdentity = await bot.api.getMe();
      })().finally(() => {
        botIdentityLoading = null;
      });
    }
    await botIdentityLoading;
  };

  const registerBotCommands = async (): Promise<void> => {
    try {
      await bot.api.setMyCommands(DEFAULT_BOT_COMMANDS);
    } catch (error) {
      logWarn('telegram setMyCommands failed', toLogDetail(error));
    }
    if (typeof botApiWithDraft.setChatMenuButton !== 'function') {
      return;
    }
    try {
      await botApiWithDraft.setChatMenuButton({
        menu_button: { type: 'commands' },
      });
    } catch (error) {
      logWarn('telegram setChatMenuButton failed', toLogDetail(error));
    }
  };

  const getWebhookSafeWatermark = async (): Promise<number | null> => {
    if (!webhookSafeWatermarkLoaded) {
      webhookSafeWatermark = await input.ports.offsets.getSafeWatermark(input.config.accountId);
      webhookSafeWatermarkLoaded = true;
    }
    return webhookSafeWatermark;
  };

  const persistWebhookSafeWatermark = async (updateId: number): Promise<void> => {
    const current = await getWebhookSafeWatermark();
    if (current === updateId) {
      return;
    }
    await input.ports.offsets.setSafeWatermark(input.config.accountId, updateId);
    webhookSafeWatermark = updateId;
  };

  const markWebhookUpdateProcessed = async (updateId: number): Promise<void> => {
    const currentWatermark = await getWebhookSafeWatermark();
    if (typeof currentWatermark === 'number' && updateId <= currentWatermark) {
      return;
    }
    if (currentWatermark === null) {
      if (!processedWebhookUpdateIds.has(updateId)) {
        processedWebhookUpdateIds.add(updateId);
        processedWebhookUpdateIdQueue.push(updateId);
        if (processedWebhookUpdateIdQueue.length > MAX_WEBHOOK_IN_MEMORY_DEDUP) {
          const oldest = processedWebhookUpdateIdQueue.shift();
          if (typeof oldest === 'number') {
            processedWebhookUpdateIds.delete(oldest);
          }
        }
      }
      return;
    }

    const expectedNext = currentWatermark + 1;
    if (updateId === expectedNext) {
      let contiguousWatermark = updateId;
      while (bufferedWebhookUpdateIds.delete(contiguousWatermark + 1)) {
        contiguousWatermark += 1;
      }
      await persistWebhookSafeWatermark(contiguousWatermark);
      return;
    }

    if (updateId > expectedNext) {
      bufferedWebhookUpdateIds.add(updateId);
    }
  };

  const processUpdate = async (update: Update): Promise<boolean> => {
    const { normalizeTelegramUpdate } = await import('./normalize-update');
    const envelope = normalizeTelegramUpdate({
      accountId: input.config.accountId,
      update,
      botUsername: botIdentity?.username,
    });

    if (!envelope) {
      return true;
    }

    const policy = await evaluateInboundPolicy(
      {
        config: input.config.policy,
        hasApprovedDmSender: async (senderId) =>
          input.ports.pairing.hasApprovedSender({
            channel: 'telegram',
            accountId: input.config.accountId,
            senderId,
          }),
      },
      envelope
    );

    if (policy.requiresPairing && envelope.sender) {
      const now = new Date();
      const createdAt = now.toISOString();
      const expiresAt = new Date(
        now.getTime() + input.config.pairingCodeTtlSeconds * 1_000
      ).toISOString();

      const request = await input.ports.pairing.createPairingRequest({
        channel: 'telegram',
        accountId: input.config.accountId,
        senderId: envelope.sender.id,
        peerId: envelope.peer.id,
        code: createPairingCode(),
        meta: toPairingRequestMeta(update),
        createdAt,
        expiresAt,
      });
      await input.events.onPairingRequired?.(request);
      return true;
    }

    if (!policy.allowed) {
      logInfo('telegram update denied by policy', {
        accountId: input.config.accountId,
        reason: policy.reason,
        peerId: envelope.peer.id,
      });
      return true;
    }

    const thread = resolveThreadKey(envelope);

    await input.events.onInbound({ envelope, thread });
    emitStatus({
      lastError: undefined,
      lastUpdateAt: new Date().toISOString(),
    });

    return true;
  };

  const runPolling = async (): Promise<void> => {
    let backoffMs = input.config.polling.idleDelayMs;

    while (running && !stopping) {
      try {
        const safeWatermark = await input.ports.offsets.getSafeWatermark(input.config.accountId);
        const updates = await bot.api.getUpdates({
          offset: safeWatermark === null ? undefined : safeWatermark + 1,
          timeout: input.config.polling.timeoutSeconds,
          limit: input.config.polling.maxBatchSize,
          allowed_updates: DEFAULT_ALLOWED_UPDATES,
        });

        let latestProcessed: number | null = safeWatermark;
        for (const update of updates) {
          if (stopping || !running) {
            break;
          }
          try {
            await processUpdate(update);
            pollingUpdateFailureCounts.delete(update.update_id);
            latestProcessed = update.update_id;
          } catch (error) {
            const failedAttempts = (pollingUpdateFailureCounts.get(update.update_id) ?? 0) + 1;
            pollingUpdateFailureCounts.set(update.update_id, failedAttempts);

            if (failedAttempts >= MAX_POLLING_UPDATE_PROCESSING_RETRIES) {
              logWarn('telegram polling skip update after retry budget exhausted', {
                accountId: input.config.accountId,
                updateId: update.update_id,
                attempts: failedAttempts,
              });
              pollingUpdateFailureCounts.delete(update.update_id);
              latestProcessed = update.update_id;
              continue;
            }
            if (typeof latestProcessed === 'number' && latestProcessed !== safeWatermark) {
              await input.ports.offsets.setSafeWatermark(input.config.accountId, latestProcessed);
            }
            throw new TelegramUpdateProcessingError(update.update_id, error);
          }
        }

        if (typeof latestProcessed === 'number' && latestProcessed !== safeWatermark) {
          await input.ports.offsets.setSafeWatermark(input.config.accountId, latestProcessed);
        }

        backoffMs = input.config.polling.idleDelayMs;
      } catch (error) {
        const isUpdateProcessingError = error instanceof TelegramUpdateProcessingError;
        const rootError = isUpdateProcessingError ? error.causeError : error;
        const failure = classifyDeliveryFailure(rootError);
        const lastError = error instanceof Error ? error.message : String(error);
        emitStatus({ lastError });

        if (isUpdateProcessingError) {
          input.logger?.error?.('telegram update processing failed', {
            ...toLogDetail(error.causeError),
            accountId: input.config.accountId,
            updateId: error.updateId,
          });
          await sleep(backoffMs);
          backoffMs = Math.min(backoffMs * 2, 5_000);
          continue;
        }

        if (error instanceof GrammyError && error.error_code === 409) {
          logWarn('telegram polling conflict detected, reset webhook and retry', {
            accountId: input.config.accountId,
          });
          try {
            await bot.api.deleteWebhook({ drop_pending_updates: false });
          } catch (cleanupError) {
            logWarn(
              'telegram deleteWebhook failed after polling conflict',
              toLogDetail(cleanupError)
            );
          }
          await sleep(backoffMs);
          backoffMs = Math.min(backoffMs * 2, 5_000);
          continue;
        }

        if (failure !== 'retryable') {
          logWarn('telegram polling stopped due to non-retryable transport error', {
            ...toLogDetail(rootError),
            accountId: input.config.accountId,
          });
          running = false;
          emitStatus({ running: false, lastError });
          await closeProxyAgent();
          return;
        }

        await sleep(backoffMs);
        backoffMs = Math.min(backoffMs * 2, 5_000);
      }
    }
  };

  const start = async (): Promise<void> => {
    if (running) {
      return;
    }

    stopping = false;
    running = true;
    emitStatus({ running: true, lastError: undefined });
    try {
      await ensureIdentity();
      await registerBotCommands();

      if (input.config.mode === 'webhook') {
        const webhook = input.config.webhook;
        if (!webhook) {
          throw new Error('webhook config is required when mode=webhook');
        }
        await bot.api.setWebhook(webhook.url, {
          secret_token: webhook.secret,
          allowed_updates: DEFAULT_ALLOWED_UPDATES,
        });
        logInfo('telegram webhook registered', {
          accountId: input.config.accountId,
        });
        return;
      }

      try {
        await bot.api.deleteWebhook({ drop_pending_updates: false });
      } catch (error) {
        logWarn('telegram deleteWebhook before polling failed', toLogDetail(error));
      }

      pollingTask = runPolling().finally(() => {
        pollingTask = null;
      });
    } catch (error) {
      running = false;
      stopping = false;
      emitStatus({
        running: false,
        lastError: error instanceof Error ? error.message : String(error),
      });
      await closeProxyAgent();
      throw error;
    }
  };

  const stop = async (): Promise<void> => {
    if (!running) {
      return;
    }

    stopping = true;
    running = false;

    if (pollingTask) {
      await pollingTask;
    }

    if (input.config.mode === 'webhook') {
      try {
        await bot.api.deleteWebhook({ drop_pending_updates: false });
      } catch (error) {
        logWarn('telegram deleteWebhook on stop failed', toLogDetail(error));
      }
    }

    await closeProxyAgent();

    emitStatus({ running: false });
  };

  const buildPreviewSessionKey = (chatId: string, streamId: string): string => {
    return `${chatId}:${streamId}`;
  };

  const resolvePreviewTransport = (
    chatId: string,
    preferred: 'auto' | 'draft' | 'message' | undefined
  ): 'draft' | 'message' => {
    if (preferred === 'message') {
      return 'message';
    }
    if (!isPrivateChatTarget(chatId)) {
      return 'message';
    }
    if (preferred === 'draft') {
      return draftApiUnavailable ? 'message' : 'draft';
    }
    return draftApiUnavailable ? 'message' : 'draft';
  };

  const sendMessageWithFallback = async (args: {
    chatId: string;
    text: string;
    format: 'html' | 'text';
    threadId?: number;
    disableWebPagePreview?: boolean;
    recordSentMessage: boolean;
  }): Promise<{
    chatId: string;
    messageId: string;
    usedFallback: TelegramSendResult['usedFallback'];
  }> => {
    let retryAttempt = 1;
    let format = args.format;
    let text = args.text;
    let threadId = args.threadId;
    let usedFallback: TelegramSendResult['usedFallback'] = null;

    while (retryAttempt <= input.config.maxSendRetries) {
      try {
        const result = await bot.api.sendMessage(args.chatId, text, {
          parse_mode: format === 'html' ? 'HTML' : undefined,
          message_thread_id: threadId,
          link_preview_options: args.disableWebPagePreview ? { is_disabled: true } : undefined,
        });
        const messageId = String(result.message_id);
        if (args.recordSentMessage) {
          await input.ports.sentMessages.rememberSentMessage({
            accountId: input.config.accountId,
            chatId: args.chatId,
            messageId,
            sentAt: new Date().toISOString(),
          });
        }
        return {
          chatId: args.chatId,
          messageId,
          usedFallback,
        };
      } catch (error) {
        const failure = classifyDeliveryFailure(error);
        if (failure === 'fallback_plaintext' && format === 'html') {
          format = 'text';
          text = stripHtmlTags(text);
          usedFallback = 'plaintext';
          continue;
        }

        if (failure === 'fallback_threadless' && threadId !== undefined) {
          threadId = undefined;
          usedFallback = 'threadless';
          continue;
        }

        if (shouldRetryDelivery(failure, retryAttempt, input.config.maxSendRetries)) {
          await sleep(computeRetryDelayMs(retryAttempt));
          retryAttempt += 1;
          continue;
        }

        logError('telegram send failed', error);
        throw error;
      }
    }

    throw new Error('send retries exhausted');
  };

  const editPreviewMessage = async (args: {
    chatId: string;
    messageId: number;
    text: string;
    format: 'html' | 'text';
    disableWebPagePreview?: boolean;
  }): Promise<{
    usedFallback: TelegramSendResult['usedFallback'];
    notModified: boolean;
  }> => {
    let retryAttempt = 1;
    let format = args.format;
    let text = args.text;
    let usedFallback: TelegramSendResult['usedFallback'] = null;

    while (retryAttempt <= input.config.maxSendRetries) {
      try {
        await bot.api.editMessageText(args.chatId, args.messageId, text, {
          parse_mode: format === 'html' ? 'HTML' : undefined,
          link_preview_options: args.disableWebPagePreview ? { is_disabled: true } : undefined,
        });
        return {
          usedFallback,
          notModified: false,
        };
      } catch (error) {
        if (isMessageNotModifiedError(error)) {
          return {
            usedFallback,
            notModified: true,
          };
        }

        const failure = classifyDeliveryFailure(error);
        if (failure === 'fallback_plaintext' && format === 'html') {
          format = 'text';
          text = stripHtmlTags(text);
          usedFallback = 'plaintext';
          continue;
        }

        if (shouldRetryDelivery(failure, retryAttempt, input.config.maxSendRetries)) {
          await sleep(computeRetryDelayMs(retryAttempt));
          retryAttempt += 1;
          continue;
        }

        logError('telegram edit preview failed', error);
        throw error;
      }
    }

    throw new Error('edit retries exhausted');
  };

  const sendPreviewDraft = async (args: {
    chatId: string;
    text: string;
    format: 'html' | 'text';
    draftId: number;
    disableWebPagePreview?: boolean;
  }): Promise<{
    usedFallback: TelegramSendResult['usedFallback'];
  }> => {
    if (typeof botApiWithDraft.sendMessageDraft !== 'function') {
      draftApiUnavailable = true;
      throw new Error('sendMessageDraft is unavailable');
    }

    let retryAttempt = 1;
    let format = args.format;
    let text = args.text;
    let usedFallback: TelegramSendResult['usedFallback'] = null;

    while (retryAttempt <= input.config.maxSendRetries) {
      try {
        await botApiWithDraft.sendMessageDraft(args.chatId, args.draftId, text, {
          parse_mode: format === 'html' ? 'HTML' : undefined,
          disable_web_page_preview: args.disableWebPagePreview ? true : undefined,
        });
        return {
          usedFallback,
        };
      } catch (error) {
        const failure = classifyDeliveryFailure(error);
        if (failure === 'fallback_plaintext' && format === 'html') {
          format = 'text';
          text = stripHtmlTags(text);
          usedFallback = 'plaintext';
          continue;
        }

        if (shouldRetryDelivery(failure, retryAttempt, input.config.maxSendRetries)) {
          await sleep(computeRetryDelayMs(retryAttempt));
          retryAttempt += 1;
          continue;
        }

        throw error;
      }
    }

    throw new Error('draft retries exhausted');
  };

  const sendFinalChunks = async (input: {
    chatId: string;
    text: string;
    format: 'html' | 'text';
    threadId?: number;
    disableWebPagePreview?: boolean;
  }): Promise<TelegramSendResult> => {
    const chunks = splitTelegramText(input.text, MAX_TELEGRAM_FINAL_TEXT);
    if (chunks.length === 0) {
      return {
        ok: true,
        chatId: input.chatId,
        usedFallback: null,
      };
    }

    let lastResult: {
      chatId: string;
      messageId: string;
      usedFallback: TelegramSendResult['usedFallback'];
    } | null = null;

    for (const chunk of chunks) {
      lastResult = await sendMessageWithFallback({
        chatId: input.chatId,
        text: chunk,
        format: input.format,
        threadId: input.threadId,
        disableWebPagePreview: input.disableWebPagePreview,
        recordSentMessage: true,
      });
    }

    if (!lastResult) {
      return {
        ok: true,
        chatId: input.chatId,
        usedFallback: null,
      };
    }

    return {
      ok: true,
      chatId: lastResult.chatId,
      messageId: lastResult.messageId,
      usedFallback: lastResult.usedFallback,
    };
  };

  const send = async (envelope: OutboundEnvelope): Promise<TelegramSendResult> => {
    if (envelope.channel !== 'telegram') {
      throw new Error('invalid channel for telegram runtime');
    }
    if (envelope.accountId !== input.config.accountId) {
      throw new Error('account mismatch for telegram runtime');
    }

    const target = normalizeTelegramTarget(envelope.target);
    const format = envelope.message.format ?? 'html';
    const text = envelope.message.text;
    const threadId = toThreadId(target.threadId);
    const delivery = envelope.message.delivery;

    if (isPreviewDelivery(delivery)) {
      const streamId = delivery.streamId.trim();
      if (!streamId) {
        throw new Error('streamId is required when delivery.mode=preview');
      }
      if (!Number.isInteger(delivery.revision) || delivery.revision < 1) {
        throw new Error('revision must be a positive integer when delivery.mode=preview');
      }
      const sessionKey = buildPreviewSessionKey(target.chatId, streamId);
      const session = previewSessions.get(sessionKey);
      if (session && delivery.revision <= session.lastRevision) {
        return {
          ok: true,
          chatId: target.chatId,
          messageId: session.previewMessageId ? String(session.previewMessageId) : undefined,
          usedFallback: null,
        };
      }

      if (delivery.action === 'clear') {
        if (session?.previewMessageId !== undefined) {
          try {
            await bot.api.deleteMessage(target.chatId, session.previewMessageId);
          } catch (error) {
            logWarn('telegram clear preview message failed', {
              accountId: input.config.accountId,
              chatId: target.chatId,
              streamId,
              error: toLogDetail(error),
            });
          }
        }
        previewSessions.delete(sessionKey);
        return {
          ok: true,
          chatId: target.chatId,
          usedFallback: null,
        };
      }

      const normalizedText = text.trim();
      const activeSession: PreviewSession =
        session ??
        (() => {
          const transport = resolvePreviewTransport(target.chatId, delivery.transport);
          const next: PreviewSession = {
            key: sessionKey,
            streamId,
            chatId: target.chatId,
            threadId,
            transport,
            draftId: undefined,
            previewMessageId: undefined,
            lastRevision: 0,
            lastText: '',
          };
          previewSessions.set(sessionKey, next);
          return next;
        })();

      if (delivery.action === 'update') {
        if (!normalizedText) {
          activeSession.lastRevision = delivery.revision;
          return {
            ok: true,
            chatId: target.chatId,
            messageId:
              typeof activeSession.previewMessageId === 'number'
                ? String(activeSession.previewMessageId)
                : undefined,
            usedFallback: null,
          };
        }
        if (normalizedText === activeSession.lastText) {
          activeSession.lastRevision = delivery.revision;
          return {
            ok: true,
            chatId: target.chatId,
            messageId:
              typeof activeSession.previewMessageId === 'number'
                ? String(activeSession.previewMessageId)
                : undefined,
            usedFallback: null,
          };
        }

        if (activeSession.transport === 'draft') {
          const draftId = activeSession.draftId ?? delivery.draftId;
          if (typeof draftId !== 'number' || !isValidDraftId(draftId)) {
            throw new Error(
              'draftId must be a non-zero 32-bit integer when preview transport=draft'
            );
          }
          activeSession.draftId = draftId;
          try {
            const draftResult = await sendPreviewDraft({
              chatId: target.chatId,
              text: normalizedText,
              format,
              draftId,
              disableWebPagePreview: envelope.message.disableWebPagePreview,
            });
            activeSession.lastRevision = delivery.revision;
            activeSession.lastText = normalizedText;
            return {
              ok: true,
              chatId: target.chatId,
              usedFallback: draftResult.usedFallback,
            };
          } catch (error) {
            if (!isDraftApiUnsupportedError(error)) {
              logError('telegram send preview draft failed', error);
              throw error;
            }
            draftApiUnavailable = true;
            activeSession.transport = 'message';
            activeSession.draftId = undefined;
            logWarn('telegram sendMessageDraft unavailable, fallback preview transport=message', {
              accountId: input.config.accountId,
              chatId: target.chatId,
              streamId,
            });
          }
        }

        if (normalizedText.length > MAX_TELEGRAM_PREVIEW_TEXT) {
          activeSession.lastRevision = delivery.revision;
          return {
            ok: true,
            chatId: target.chatId,
            messageId:
              typeof activeSession.previewMessageId === 'number'
                ? String(activeSession.previewMessageId)
                : undefined,
            usedFallback: null,
          };
        }

        if (typeof activeSession.previewMessageId === 'number') {
          const editResult = await editPreviewMessage({
            chatId: target.chatId,
            messageId: activeSession.previewMessageId,
            text: normalizedText,
            format,
            disableWebPagePreview: envelope.message.disableWebPagePreview,
          });
          activeSession.lastRevision = delivery.revision;
          activeSession.lastText = normalizedText;
          return {
            ok: true,
            chatId: target.chatId,
            messageId: String(activeSession.previewMessageId),
            usedFallback: editResult.usedFallback,
          };
        }

        const previewSendResult = await sendMessageWithFallback({
          chatId: target.chatId,
          text: normalizedText,
          format,
          threadId,
          disableWebPagePreview: envelope.message.disableWebPagePreview,
          recordSentMessage: false,
        });
        activeSession.previewMessageId = Number.parseInt(previewSendResult.messageId, 10);
        activeSession.lastRevision = delivery.revision;
        activeSession.lastText = normalizedText;
        return {
          ok: true,
          chatId: target.chatId,
          messageId: previewSendResult.messageId,
          usedFallback: previewSendResult.usedFallback,
        };
      }

      if (delivery.action === 'commit') {
        const previewMessageId = activeSession.previewMessageId;
        const canFinalizeInPreviewMessage =
          activeSession.transport === 'message' &&
          typeof previewMessageId === 'number' &&
          normalizedText.length > 0 &&
          normalizedText.length <= MAX_TELEGRAM_PREVIEW_TEXT;

        if (canFinalizeInPreviewMessage) {
          try {
            const editResult = await editPreviewMessage({
              chatId: target.chatId,
              messageId: previewMessageId,
              text: normalizedText,
              format,
              disableWebPagePreview: envelope.message.disableWebPagePreview,
            });
            previewSessions.delete(sessionKey);
            return {
              ok: true,
              chatId: target.chatId,
              messageId: String(previewMessageId),
              usedFallback: editResult.usedFallback,
            };
          } catch (error) {
            logWarn('telegram finalize preview edit failed, fallback to final send', {
              accountId: input.config.accountId,
              chatId: target.chatId,
              streamId,
              error: toLogDetail(error),
            });
          }
        }

        const finalSendResult = await sendFinalChunks({
          chatId: target.chatId,
          text: normalizedText,
          format,
          threadId,
          disableWebPagePreview: envelope.message.disableWebPagePreview,
        });
        if (activeSession.transport === 'message' && activeSession.previewMessageId !== undefined) {
          try {
            await bot.api.deleteMessage(target.chatId, activeSession.previewMessageId);
          } catch (error) {
            logWarn('telegram cleanup superseded preview message failed', {
              accountId: input.config.accountId,
              chatId: target.chatId,
              streamId,
              error: toLogDetail(error),
            });
          }
        }
        previewSessions.delete(sessionKey);
        return finalSendResult;
      }

      throw new Error(`unsupported preview action: ${delivery.action as string}`);
    }

    const finalResult = await sendMessageWithFallback({
      chatId: target.chatId,
      text,
      format,
      threadId,
      disableWebPagePreview: envelope.message.disableWebPagePreview,
      recordSentMessage: true,
    });
    return {
      ok: true,
      chatId: finalResult.chatId,
      messageId: finalResult.messageId,
      usedFallback: finalResult.usedFallback,
    };
  };

  const handleWebhookUpdate = async (rawUpdate: unknown): Promise<void> => {
    if (!rawUpdate || typeof rawUpdate !== 'object') {
      return;
    }
    await ensureIdentity();
    const update = rawUpdate as Update;
    const updateId = typeof update.update_id === 'number' ? update.update_id : undefined;

    if (updateId === undefined) {
      await processUpdate(update);
      return;
    }

    const safeWatermark = await getWebhookSafeWatermark();
    if (typeof safeWatermark === 'number' && updateId <= safeWatermark) {
      return;
    }
    if (safeWatermark === null && processedWebhookUpdateIds.has(updateId)) {
      return;
    }
    if (bufferedWebhookUpdateIds.has(updateId)) {
      return;
    }
    if (processingWebhookUpdateIds.has(updateId)) {
      return;
    }

    processingWebhookUpdateIds.add(updateId);
    try {
      await processUpdate(update);
      webhookUpdateFailureCounts.delete(updateId);
      await markWebhookUpdateProcessed(updateId);
    } catch (error) {
      const failedAttempts = (webhookUpdateFailureCounts.get(updateId) ?? 0) + 1;
      webhookUpdateFailureCounts.set(updateId, failedAttempts);

      if (failedAttempts >= MAX_WEBHOOK_UPDATE_PROCESSING_RETRIES) {
        logWarn('telegram webhook skip update after retry budget exhausted', {
          accountId: input.config.accountId,
          updateId,
          attempts: failedAttempts,
        });
        webhookUpdateFailureCounts.delete(updateId);
        await markWebhookUpdateProcessed(updateId);
        return;
      }

      throw error;
    } finally {
      processingWebhookUpdateIds.delete(updateId);
    }
  };

  const getStatus = (): TelegramRuntimeStatus => status;

  return {
    start,
    stop,
    send,
    getStatus,
    handleWebhookUpdate,
  };
};
