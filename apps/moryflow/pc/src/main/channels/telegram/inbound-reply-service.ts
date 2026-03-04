/**
 * [INPUT]: Telegram inbound dispatch + runtime send 回调
 * [OUTPUT]: Telegram 入站消息编排处理器（reply/pairing reminder）
 * [POS]: Telegram inbound -> agent -> outbound 业务编排层
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { createRunModelStreamNormalizer, isRunRawModelStreamEvent } from '@moryflow/agents-runtime';
import type { OutboundEnvelope, PairingRequest } from '@moryflow/channels-core';
import type { TelegramInboundDispatch } from '@moryflow/channels-telegram';
import { createChatSession } from '../../agent-runtime/index.js';
import { getRuntime } from '../../chat/runtime.js';

const MAX_TELEGRAM_TEXT = 3_800;
const DEFAULT_DRAFT_FLUSH_INTERVAL_MS = 350;

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
  sessionKey: string;
  userInput: string;
  onDeltaText?: (text: string) => Promise<void>;
}): Promise<string> => {
  const normalizer = createRunModelStreamNormalizer();
  const session = createChatSession(input.sessionKey);
  const runResult = await getRuntime().runChatTurn({
    chatId: input.sessionKey,
    input: input.userInput,
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
      await input.onDeltaText?.(text);
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
  enableDraftStreaming?: boolean;
  draftFlushIntervalMs?: number;
}) => {
  const peerReplyQueue = new Map<string, Promise<void>>();
  const draftStreamingEnabled = input.enableDraftStreaming ?? true;
  const draftFlushIntervalMs = normalizeDraftFlushInterval(input.draftFlushIntervalMs);

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

  return async (dispatch: TelegramInboundDispatch): Promise<void> => {
    const userInput = toUserInput(dispatch);
    if (!userInput) {
      return;
    }

    await runSequentialByPeer(dispatch.envelope.peer.id, async () => {
      const shouldPreview = shouldEnablePreviewStreaming(dispatch, draftStreamingEnabled);
      const draftId = shouldPreview ? createDraftId() : null;
      const streamId = shouldPreview ? createPreviewStreamId() : null;
      let previewRevision = 0;
      let hasPreviewUpdateSent = false;
      let previewDeliveryFailed = false;
      let lastDraftSentAt = 0;
      let lastDraftText = '';

      const sendDraftIfNeeded = async (currentText: string): Promise<void> => {
        if (previewDeliveryFailed) {
          return;
        }
        if (!shouldPreview || draftId === null || streamId === null) {
          return;
        }
        const normalizedText = currentText.trim();
        if (!normalizedText) {
          return;
        }
        if (normalizedText === lastDraftText) {
          return;
        }

        const now = Date.now();
        if (lastDraftSentAt > 0 && now - lastDraftSentAt < draftFlushIntervalMs) {
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
          lastDraftSentAt = now;
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
      };

      const sessionKey = dispatch.thread.sessionKey;
      const reply = await streamReplyText({
        sessionKey,
        userInput,
        onDeltaText: sendDraftIfNeeded,
      });
      if (!reply) {
        if (shouldPreview && streamId && hasPreviewUpdateSent && !previewDeliveryFailed) {
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
          } catch (error) {
            console.warn('[telegram-channel] preview clear failed', {
              accountId: input.accountId,
              chatId: dispatch.envelope.peer.id,
              streamId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        return;
      }

      if (shouldPreview && streamId && !previewDeliveryFailed) {
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
