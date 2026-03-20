/**
 * [INPUT]: Telegram inbound dispatch + runtime send 回调
 * [OUTPUT]: Telegram 入站消息编排处理器（reply/pairing reminder）
 * [POS]: Telegram inbound -> agent -> outbound 业务编排层
 *
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { createRunModelStreamNormalizer, isRunRawModelStreamEvent } from '@moryflow/agents-runtime';
import type { OutboundEnvelope, PairingRequest } from '@moryflow/channels-core';
import { parseTelegramCommand, type TelegramInboundDispatch } from '@moryflow/channels-telegram';
import { createChatSession } from '../../agent-runtime/index.js';
import { getRuntime } from '../../chat/services/runtime.js';
import type { AgentChatRequestOptions } from '../../../shared/ipc.js';

const MAX_TELEGRAM_TEXT = 3_800;
const DEFAULT_DRAFT_FLUSH_INTERVAL_MS = 350;
const DEFAULT_UI_PREVIEW_FLUSH_INTERVAL_MS = 120;
const COMMAND_START_ACK = 'Conversation is ready. Send your next message to continue.';
const COMMAND_NEW_ACK = 'Started a new conversation. Send your next message to continue.';
const NEW_CONVERSATION_RETRY_CACHE_LIMIT = 512;

type TelegramRuntimeAgentOptions = Pick<
  AgentChatRequestOptions,
  'preferredModelId' | 'thinking' | 'thinkingProfile'
>;

const splitTelegramText = (text: string): string[] => {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }
  if (normalized.length <= MAX_TELEGRAM_TEXT) {
    return [normalized];
  }

  const parts: string[] = [];
  let offset = 0;
  while (offset < normalized.length) {
    parts.push(normalized.slice(offset, offset + MAX_TELEGRAM_TEXT));
    offset += MAX_TELEGRAM_TEXT;
  }
  return parts;
};

const toUserInput = (dispatch: TelegramInboundDispatch): string | null => {
  if (dispatch.envelope.sender?.isBot) {
    return null;
  }

  if (dispatch.envelope.eventKind === 'message_reaction') {
    return null;
  }

  const text = dispatch.envelope.message.text?.trim();
  if (text) {
    return text;
  }

  const callbackData = dispatch.envelope.message.callbackData?.trim();
  if (callbackData) {
    return `User clicked callback: ${callbackData}`;
  }

  return null;
};

const normalizeDraftFlushInterval = (value: number | undefined): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_DRAFT_FLUSH_INTERVAL_MS;
  }
  return Math.max(0, Math.trunc(value as number));
};

const createDraftId = (): number => {
  const seed = Date.now() + Math.floor(Math.random() * 100_000);
  const maxInt32 = 2_147_483_647;
  const normalized = seed % maxInt32;
  return normalized === 0 ? 1 : normalized;
};

const createPreviewStreamId = (): string => {
  return `tg_preview_${Date.now()}_${Math.floor(Math.random() * 100_000)}`;
};

const shouldEnablePreviewStreaming = (
  dispatch: TelegramInboundDispatch,
  enabled: boolean
): boolean => {
  return enabled && dispatch.envelope.peer.type === 'private';
};

const streamReplyText = async (input: {
  conversationId: string;
  userInput: string;
  agentOptions?: TelegramRuntimeAgentOptions;
  onDeltaText?: (text: string) => void | Promise<void>;
}): Promise<string> => {
  const normalizer = createRunModelStreamNormalizer();
  const session = createChatSession(input.conversationId);
  const runResult = await getRuntime().runChatTurn({
    chatId: input.conversationId,
    input: input.userInput,
    preferredModelId: input.agentOptions?.preferredModelId,
    thinking: input.agentOptions?.thinking,
    thinkingProfile: input.agentOptions?.thinkingProfile,
    session,
    mode: 'full_access',
  });

  let text = '';
  for await (const event of runResult.result) {
    if (!isRunRawModelStreamEvent(event)) {
      continue;
    }
    const extracted = normalizer.consume(event.data);
    if (extracted.deltaText) {
      text += extracted.deltaText;
      const onDeltaTask = input.onDeltaText?.(text);
      if (onDeltaTask && typeof (onDeltaTask as Promise<void>).then === 'function') {
        void (onDeltaTask as Promise<void>).catch(() => undefined);
      }
    }
  }
  await runResult.result.completed;

  const finalOutput = runResult.result.finalOutput;
  if (!text.trim() && typeof finalOutput === 'string') {
    text = finalOutput;
  }

  return text.trim();
};

export const createTelegramInboundReplyHandler = (input: {
  accountId: string;
  sendEnvelope: (envelope: OutboundEnvelope) => Promise<void>;
  resolveConversationId: (
    thread: TelegramInboundDispatch['thread'],
    peer?: { title?: string; username?: string }
  ) => Promise<string>;
  createNewConversationId: (thread: TelegramInboundDispatch['thread']) => Promise<string>;
  resolveAgentOptions?: (
    conversationId: string
  ) => Promise<TelegramRuntimeAgentOptions | undefined> | TelegramRuntimeAgentOptions | undefined;
  syncConversationUiState?: (conversationId: string) => Promise<void> | void;
  publishConversationPreview?: (preview: {
    conversationId: string;
    streamId: string;
    userInput: string;
    assistantText: string;
  }) => Promise<void> | void;
  enableDraftStreaming?: boolean;
  draftFlushIntervalMs?: number;
}) => {
  const peerReplyQueue = new Map<string, Promise<void>>();
  const newConversationRetryCache = new Map<string, true>();
  const draftStreamingEnabled = input.enableDraftStreaming ?? true;
  const draftFlushIntervalMs = normalizeDraftFlushInterval(input.draftFlushIntervalMs);
  const uiPreviewFlushIntervalMs = Math.min(
    Math.max(draftFlushIntervalMs, DEFAULT_UI_PREVIEW_FLUSH_INTERVAL_MS),
    250
  );

  const runSequentialByPeer = async (peerId: string, task: () => Promise<void>): Promise<void> => {
    const previous = peerReplyQueue.get(peerId) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(task);
    peerReplyQueue.set(peerId, current);
    try {
      await current;
    } finally {
      if (peerReplyQueue.get(peerId) === current) {
        peerReplyQueue.delete(peerId);
      }
    }
  };

  const rememberNewConversationAttempt = (eventId: string): void => {
    newConversationRetryCache.set(eventId, true);
    if (newConversationRetryCache.size <= NEW_CONVERSATION_RETRY_CACHE_LIMIT) {
      return;
    }
    const oldest = newConversationRetryCache.keys().next().value;
    if (oldest) {
      newConversationRetryCache.delete(oldest);
    }
  };

  const syncConversationUiStateIfNeeded = async (conversationId: string): Promise<void> => {
    if (!input.syncConversationUiState) {
      return;
    }
    try {
      await input.syncConversationUiState(conversationId);
    } catch (error) {
      console.warn('[telegram-channel] failed to sync conversation ui state', {
        accountId: input.accountId,
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const publishConversationPreviewIfNeeded = async (preview: {
    conversationId: string;
    streamId: string;
    userInput: string;
    assistantText: string;
  }): Promise<void> => {
    if (!input.publishConversationPreview) {
      return;
    }
    try {
      await input.publishConversationPreview(preview);
    } catch (error) {
      console.warn('[telegram-channel] failed to publish conversation preview', {
        accountId: input.accountId,
        conversationId: preview.conversationId,
        streamId: preview.streamId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return async (dispatch: TelegramInboundDispatch): Promise<void> => {
    const userInput = toUserInput(dispatch);
    if (!userInput) {
      return;
    }

    await runSequentialByPeer(dispatch.envelope.peer.id, async () => {
      const command =
        dispatch.envelope.peer.type === 'private'
          ? parseTelegramCommand(dispatch.envelope.message.text)
          : null;

      if (command?.kind === 'start') {
        const conversationId = await input.resolveConversationId(
          dispatch.thread,
          dispatch.envelope.peer
        );
        await syncConversationUiStateIfNeeded(conversationId);
        await input.sendEnvelope({
          channel: 'telegram',
          accountId: input.accountId,
          target: {
            chatId: dispatch.envelope.peer.id,
            threadId: dispatch.envelope.message.threadId,
          },
          message: {
            text: COMMAND_START_ACK,
            format: 'text',
          },
        });
        return;
      }

      if (command?.kind === 'new') {
        const eventId = dispatch.envelope.eventId;
        let conversationId: string | null = null;
        if (!newConversationRetryCache.has(eventId)) {
          conversationId = await input.createNewConversationId(dispatch.thread);
          rememberNewConversationAttempt(eventId);
        }

        await input.sendEnvelope({
          channel: 'telegram',
          accountId: input.accountId,
          target: {
            chatId: dispatch.envelope.peer.id,
            threadId: dispatch.envelope.message.threadId,
          },
          message: {
            text: COMMAND_NEW_ACK,
            format: 'text',
          },
        });
        if (!conversationId) {
          conversationId = await input.resolveConversationId(
            dispatch.thread,
            dispatch.envelope.peer
          );
        }
        await syncConversationUiStateIfNeeded(conversationId);
        newConversationRetryCache.delete(eventId);
        return;
      }

      const shouldPreview = shouldEnablePreviewStreaming(dispatch, draftStreamingEnabled);
      const draftId = shouldPreview ? createDraftId() : null;
      const streamId = createPreviewStreamId();
      let previewRevision = 0;
      let hasPreviewUpdateSent = false;
      let previewDeliveryFailed = false;
      let previewClearSent = false;
      let lastDraftSentAt = 0;
      let lastDraftText = '';
      let queuedDraftText = '';
      let previewUpdateTask: Promise<void> | null = null;
      let previewUpdateTimer: ReturnType<typeof setTimeout> | null = null;
      let previewStreamClosed = false;
      let uiPreviewTask: Promise<void> | null = null;
      let uiPreviewTimer: ReturnType<typeof setTimeout> | null = null;
      let uiPreviewClosed = false;
      let lastUiPreviewSentAt = 0;
      let lastUiPreviewText: string | null = null;
      let queuedUiPreviewText: string | null = null;

      const clearScheduledPreviewUpdate = (): void => {
        if (!previewUpdateTimer) {
          return;
        }
        clearTimeout(previewUpdateTimer);
        previewUpdateTimer = null;
      };

      const waitForPreviewUpdateDrain = async (): Promise<void> => {
        while (previewUpdateTask) {
          await previewUpdateTask;
        }
      };

      const clearScheduledUiPreview = (): void => {
        if (!uiPreviewTimer) {
          return;
        }
        clearTimeout(uiPreviewTimer);
        uiPreviewTimer = null;
      };

      const waitForUiPreviewDrain = async (): Promise<void> => {
        while (uiPreviewTask) {
          await uiPreviewTask;
        }
      };

      const schedulePreviewAttempt = (delayMs: number): void => {
        if (previewUpdateTimer || previewStreamClosed || previewDeliveryFailed) {
          return;
        }
        previewUpdateTimer = setTimeout(
          () => {
            previewUpdateTimer = null;
            trySendPreviewUpdate();
          },
          Math.max(0, delayMs)
        );
      };

      const trySendPreviewUpdate = (): void => {
        if (previewStreamClosed || previewDeliveryFailed || previewUpdateTask) {
          return;
        }
        if (!shouldPreview || draftId === null) {
          return;
        }
        const normalizedText = queuedDraftText.trim();
        if (!normalizedText || normalizedText === lastDraftText) {
          return;
        }

        const now = Date.now();
        if (lastDraftSentAt > 0 && now - lastDraftSentAt < draftFlushIntervalMs) {
          schedulePreviewAttempt(draftFlushIntervalMs - (now - lastDraftSentAt));
          return;
        }

        previewUpdateTask = (async () => {
          try {
            await input.sendEnvelope({
              channel: 'telegram',
              accountId: input.accountId,
              target: {
                chatId: dispatch.envelope.peer.id,
              },
              message: {
                text: normalizedText,
                format: 'text',
                delivery: {
                  mode: 'preview',
                  action: 'update',
                  streamId,
                  revision: previewRevision + 1,
                  draftId: draftId ?? undefined,
                  transport: 'auto',
                },
              },
            });
            previewRevision += 1;
            hasPreviewUpdateSent = true;
            lastDraftSentAt = Date.now();
            lastDraftText = normalizedText;
          } catch (error) {
            previewDeliveryFailed = true;
            console.warn('[telegram-channel] preview update failed, fallback to final send', {
              accountId: input.accountId,
              chatId: dispatch.envelope.peer.id,
              streamId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })()
          .catch(() => undefined)
          .finally(() => {
            previewUpdateTask = null;
            if (previewStreamClosed || previewDeliveryFailed) {
              return;
            }
            if (queuedDraftText.trim() !== lastDraftText) {
              trySendPreviewUpdate();
            }
          });
      };

      const scheduleUiPreviewAttempt = (delayMs: number): void => {
        if (uiPreviewTimer || uiPreviewClosed) {
          return;
        }
        uiPreviewTimer = setTimeout(
          () => {
            uiPreviewTimer = null;
            tryPublishUiPreview();
          },
          Math.max(0, delayMs)
        );
      };

      const tryPublishUiPreview = (): void => {
        if (uiPreviewClosed || uiPreviewTask) {
          return;
        }
        if (queuedUiPreviewText === null || queuedUiPreviewText === lastUiPreviewText) {
          return;
        }
        const now = Date.now();
        if (lastUiPreviewSentAt > 0 && now - lastUiPreviewSentAt < uiPreviewFlushIntervalMs) {
          scheduleUiPreviewAttempt(uiPreviewFlushIntervalMs - (now - lastUiPreviewSentAt));
          return;
        }
        const assistantText = queuedUiPreviewText;
        uiPreviewTask = (async () => {
          await publishConversationPreviewIfNeeded({
            conversationId,
            streamId,
            userInput,
            assistantText,
          });
          lastUiPreviewSentAt = Date.now();
          lastUiPreviewText = assistantText;
        })()
          .catch(() => undefined)
          .finally(() => {
            uiPreviewTask = null;
            if (uiPreviewClosed) {
              return;
            }
            if (queuedUiPreviewText !== lastUiPreviewText) {
              tryPublishUiPreview();
            }
          });
      };

      const clearPreviewIfNeeded = async (): Promise<void> => {
        if (previewClearSent) {
          return;
        }
        if (!shouldPreview || !hasPreviewUpdateSent) {
          return;
        }
        try {
          await input.sendEnvelope({
            channel: 'telegram',
            accountId: input.accountId,
            target: {
              chatId: dispatch.envelope.peer.id,
            },
            message: {
              text: '',
              format: 'text',
              delivery: {
                mode: 'preview',
                action: 'clear',
                streamId,
                revision: previewRevision + 1,
                draftId: draftId ?? undefined,
                transport: 'auto',
              },
            },
          });
          previewRevision += 1;
          previewClearSent = true;
        } catch (error) {
          console.warn('[telegram-channel] preview clear failed', {
            accountId: input.accountId,
            chatId: dispatch.envelope.peer.id,
            streamId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      };

      const queueDraftIfNeeded = (currentText: string): void => {
        if (previewStreamClosed || previewDeliveryFailed) {
          return;
        }
        if (!shouldPreview || draftId === null) {
          return;
        }
        const normalizedText = currentText.trim();
        if (!normalizedText) {
          return;
        }
        if (normalizedText === lastDraftText) {
          return;
        }
        queuedDraftText = normalizedText;
        trySendPreviewUpdate();
      };

      const queueUiPreviewIfNeeded = (currentText: string): void => {
        if (uiPreviewClosed || !input.publishConversationPreview) {
          return;
        }
        queuedUiPreviewText = currentText.trim();
        tryPublishUiPreview();
      };

      const conversationId = await input.resolveConversationId(
        dispatch.thread,
        dispatch.envelope.peer
      );
      const agentOptions = await input.resolveAgentOptions?.(conversationId);
      queueUiPreviewIfNeeded('');
      let reply = '';
      let streamError: unknown = null;
      try {
        reply = await streamReplyText({
          conversationId,
          userInput,
          agentOptions,
          onDeltaText: (nextText) => {
            queueDraftIfNeeded(nextText);
            queueUiPreviewIfNeeded(nextText);
          },
        });
      } catch (error) {
        streamError = error;
      } finally {
        previewStreamClosed = true;
        clearScheduledPreviewUpdate();
        await waitForPreviewUpdateDrain();
        clearScheduledUiPreview();
        lastUiPreviewSentAt = 0;
        tryPublishUiPreview();
        await waitForUiPreviewDrain();
        uiPreviewClosed = true;
      }
      if (streamError) {
        await syncConversationUiStateIfNeeded(conversationId);
        throw streamError;
      }
      if (!reply) {
        if (shouldPreview && hasPreviewUpdateSent) {
          await clearPreviewIfNeeded();
        }
        await syncConversationUiStateIfNeeded(conversationId);
        return;
      }

      if (shouldPreview && !previewDeliveryFailed) {
        try {
          await input.sendEnvelope({
            channel: 'telegram',
            accountId: input.accountId,
            target: {
              chatId: dispatch.envelope.peer.id,
              threadId: dispatch.envelope.message.threadId,
            },
            message: {
              text: reply,
              format: 'text',
              delivery: {
                mode: 'preview',
                action: 'commit',
                streamId,
                revision: previewRevision + 1,
                draftId: draftId ?? undefined,
                transport: 'auto',
              },
            },
          });
          await syncConversationUiStateIfNeeded(conversationId);
          return;
        } catch (error) {
          previewDeliveryFailed = true;
          console.warn('[telegram-channel] preview commit failed, fallback to final send', {
            accountId: input.accountId,
            chatId: dispatch.envelope.peer.id,
            streamId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (previewDeliveryFailed) {
        await clearPreviewIfNeeded();
      }

      const chunks = splitTelegramText(reply);
      for (const chunk of chunks) {
        const outbound: OutboundEnvelope = {
          channel: 'telegram',
          accountId: input.accountId,
          target: {
            chatId: dispatch.envelope.peer.id,
            threadId: dispatch.envelope.message.threadId,
          },
          message: {
            text: chunk,
            format: 'text',
          },
        };
        await input.sendEnvelope(outbound);
      }
      await syncConversationUiStateIfNeeded(conversationId);
    });
  };
};

export const createTelegramPairingReminderHandler = (input: {
  accountId: string;
  sendEnvelope: (envelope: OutboundEnvelope) => Promise<void>;
}) => {
  return async (request: PairingRequest): Promise<void> => {
    const reminder: OutboundEnvelope = {
      channel: 'telegram',
      accountId: input.accountId,
      target: {
        chatId: request.peerId,
      },
      message: {
        text: 'Your message needs local approval in Moryflow PC. Please ask the owner to approve this pairing request.',
        format: 'text',
      },
    };
    try {
      await input.sendEnvelope(reminder);
    } catch (error) {
      console.warn('[telegram-channel] failed to send pairing reminder', error);
    }
  };
};
