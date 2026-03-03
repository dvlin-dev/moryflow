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
  type OutboundEnvelope,
} from '@moryflow/channels-core';
import { Bot, GrammyError } from 'grammy';
import type { Update, UserFromGetMe } from 'grammy/types';
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

const toThreadId = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
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
  const bot = new Bot(input.config.botToken);
  let botIdentity: UserFromGetMe | null = null;
  let pollingTask: Promise<void> | null = null;
  let stopping = false;
  let running = false;

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

  const ensureIdentity = async (): Promise<void> => {
    if (botIdentity) {
      return;
    }
    botIdentity = await bot.api.getMe();
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
    await input.ports.sessions.upsertSession({
      channel: 'telegram',
      accountId: input.config.accountId,
      peerKey: thread.peerKey,
      threadKey: thread.threadKey,
      sessionKey: thread.sessionKey,
      updatedAt: new Date().toISOString(),
    });

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
            latestProcessed = update.update_id;
          } catch (error) {
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

    emitStatus({ running: false });
  };

  const send = async (envelope: OutboundEnvelope): Promise<TelegramSendResult> => {
    if (envelope.channel !== 'telegram') {
      throw new Error('invalid channel for telegram runtime');
    }
    if (envelope.accountId !== input.config.accountId) {
      throw new Error('account mismatch for telegram runtime');
    }

    const target = normalizeTelegramTarget(envelope.target);
    let threadId = toThreadId(target.threadId);
    let format = envelope.message.format ?? 'html';
    let text = envelope.message.text;
    let usedFallback: TelegramSendResult['usedFallback'] = null;

    let retryAttempt = 1;
    while (retryAttempt <= input.config.maxSendRetries) {
      try {
        const result = await bot.api.sendMessage(target.chatId, text, {
          parse_mode: format === 'html' ? 'HTML' : undefined,
          message_thread_id: threadId,
          link_preview_options: envelope.message.disableWebPagePreview
            ? { is_disabled: true }
            : undefined,
        });

        await input.ports.sentMessages.rememberSentMessage({
          accountId: input.config.accountId,
          chatId: target.chatId,
          messageId: String(result.message_id),
          sentAt: new Date().toISOString(),
        });

        return {
          ok: true,
          chatId: target.chatId,
          messageId: String(result.message_id),
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

  const handleWebhookUpdate = async (rawUpdate: unknown): Promise<void> => {
    if (!rawUpdate || typeof rawUpdate !== 'object') {
      return;
    }
    await processUpdate(rawUpdate as Update);
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
