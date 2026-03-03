/**
 * [INPUT]: Telegram raw update + 账户上下文
 * [OUTPUT]: InboundEnvelope | null
 * [POS]: Telegram Update 归一入口（message/callback/reaction）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { InboundEnvelope, InboundEventKind } from '@moryflow/channels-core';
import type { CallbackQuery, Chat, Message, MessageEntity, Update } from 'grammy/types';

type NormalizeUpdateInput = {
  accountId: string;
  update: Update;
  botUsername?: string;
};

const toIsoString = (unixSeconds: number | undefined): string => {
  if (!unixSeconds || !Number.isFinite(unixSeconds)) {
    return new Date().toISOString();
  }
  return new Date(unixSeconds * 1000).toISOString();
};

const hasMention = (
  text: string | undefined,
  entities: MessageEntity[] | undefined,
  botUsername?: string
): boolean => {
  if (!text || !Array.isArray(entities) || entities.length === 0) {
    return false;
  }

  for (const entity of entities) {
    if (entity.type !== 'mention') {
      continue;
    }
    const mention = text
      .slice(entity.offset, entity.offset + entity.length)
      .trim()
      .toLowerCase();
    if (!mention.startsWith('@')) {
      continue;
    }
    if (!botUsername) {
      return true;
    }
    const expected = `@${botUsername.trim().toLowerCase()}`;
    if (mention === expected) {
      return true;
    }
  }
  return false;
};

const toPeerType = (chat: Chat): InboundEnvelope['peer']['type'] => {
  if (chat.type === 'private') return 'private';
  if (chat.type === 'group') return 'group';
  if (chat.type === 'supergroup') return 'supergroup';
  if (chat.type === 'channel') return 'channel';
  return 'unknown';
};

const mapMessageEnvelope = (input: {
  accountId: string;
  updateId: number;
  message: Message;
  kind: InboundEventKind;
  botUsername?: string;
}): InboundEnvelope => {
  const messageText = 'text' in input.message ? input.message.text : undefined;
  const entities = 'entities' in input.message ? input.message.entities : undefined;

  return {
    channel: 'telegram',
    accountId: input.accountId,
    eventId: `${input.accountId}:${input.updateId}`,
    eventKind: input.kind,
    occurredAt: toIsoString(input.message.date),
    peer: {
      id: String(input.message.chat.id),
      type: toPeerType(input.message.chat),
      title: 'title' in input.message.chat ? input.message.chat.title : undefined,
      username: 'username' in input.message.chat ? input.message.chat.username : undefined,
    },
    sender: input.message.from
      ? {
          id: String(input.message.from.id),
          username: input.message.from.username,
          isBot: input.message.from.is_bot,
        }
      : undefined,
    message: {
      text: messageText,
      hasMention: hasMention(messageText, entities, input.botUsername),
      threadId:
        'message_thread_id' in input.message && typeof input.message.message_thread_id === 'number'
          ? String(input.message.message_thread_id)
          : undefined,
      messageId: String(input.message.message_id),
    },
    raw: input.message,
  };
};

const mapCallbackEnvelope = (input: {
  accountId: string;
  updateId: number;
  callback: CallbackQuery;
}): InboundEnvelope | null => {
  const message = input.callback.message;
  if (!message) {
    return null;
  }

  return {
    channel: 'telegram',
    accountId: input.accountId,
    eventId: `${input.accountId}:${input.updateId}`,
    eventKind: 'callback_query',
    occurredAt: toIsoString(message.date),
    peer: {
      id: String(message.chat.id),
      type: toPeerType(message.chat),
      title: 'title' in message.chat ? message.chat.title : undefined,
      username: 'username' in message.chat ? message.chat.username : undefined,
    },
    sender: {
      id: String(input.callback.from.id),
      username: input.callback.from.username,
      isBot: input.callback.from.is_bot,
    },
    message: {
      callbackData: input.callback.data,
      threadId:
        'message_thread_id' in message && typeof message.message_thread_id === 'number'
          ? String(message.message_thread_id)
          : undefined,
      messageId: String(message.message_id),
      hasMention: true,
    },
    raw: input.callback,
  };
};

const mapReactionEnvelope = (input: {
  accountId: string;
  updateId: number;
  reaction: Update['message_reaction'];
}): InboundEnvelope | null => {
  const reaction = input.reaction;
  if (!reaction) {
    return null;
  }
  const actorId = reaction.user
    ? String(reaction.user.id)
    : reaction.actor_chat
      ? String(reaction.actor_chat.id)
      : undefined;
  const actorUsername = reaction.user?.username;
  const actorIsBot = reaction.user?.is_bot ?? false;

  return {
    channel: 'telegram',
    accountId: input.accountId,
    eventId: `${input.accountId}:${input.updateId}`,
    eventKind: 'message_reaction',
    occurredAt: new Date().toISOString(),
    peer: {
      id: String(reaction.chat.id),
      type: toPeerType(reaction.chat),
      title: 'title' in reaction.chat ? reaction.chat.title : undefined,
      username: 'username' in reaction.chat ? reaction.chat.username : undefined,
    },
    sender: actorId
      ? {
          id: actorId,
          username: actorUsername,
          isBot: actorIsBot,
        }
      : undefined,
    message: {
      hasMention: true,
      messageId: String(reaction.message_id),
    },
    raw: reaction,
  };
};

export const normalizeTelegramUpdate = (input: NormalizeUpdateInput): InboundEnvelope | null => {
  const { update } = input;
  const updateId = update.update_id;
  if (typeof updateId !== 'number') {
    return null;
  }

  if (update.message) {
    return mapMessageEnvelope({
      accountId: input.accountId,
      updateId,
      message: update.message,
      kind: 'message',
      botUsername: input.botUsername,
    });
  }

  if (update.channel_post) {
    return mapMessageEnvelope({
      accountId: input.accountId,
      updateId,
      message: update.channel_post,
      kind: 'channel_post',
      botUsername: input.botUsername,
    });
  }

  if (update.callback_query) {
    return mapCallbackEnvelope({
      accountId: input.accountId,
      updateId,
      callback: update.callback_query,
    });
  }

  if (update.message_reaction) {
    return mapReactionEnvelope({
      accountId: input.accountId,
      updateId,
      reaction: update.message_reaction,
    });
  }

  return null;
};
