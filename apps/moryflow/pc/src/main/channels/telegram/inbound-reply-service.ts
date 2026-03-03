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

const generateReplyText = async (input: {
  sessionKey: string;
  userInput: string;
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
}) => {
  return async (dispatch: TelegramInboundDispatch): Promise<void> => {
    const userInput = toUserInput(dispatch);
    if (!userInput) {
      return;
    }

    const sessionKey = dispatch.thread.sessionKey;
    const reply = await generateReplyText({ sessionKey, userInput });
    if (!reply) {
      return;
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
