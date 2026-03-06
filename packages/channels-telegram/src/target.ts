/**
 * [INPUT]: Telegram target 字符串或结构体
 * [OUTPUT]: 标准化 chatId + threadId
 * [POS]: Telegram 出站目标解析（chat/topic 统一）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { OutboundTarget } from '@moryflow/channels-core';

export const parseTelegramTarget = (value: string): OutboundTarget => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('target is required');
  }

  const [chatIdRaw, threadRaw] = trimmed.split('#');
  const chatId = chatIdRaw.trim();
  if (!chatId) {
    throw new Error('chatId is required');
  }

  const threadId = threadRaw?.trim();
  return {
    chatId,
    threadId: threadId && threadId.length > 0 ? threadId : undefined,
  };
};

export const normalizeTelegramTarget = (target: OutboundTarget): OutboundTarget => {
  const chatId = target.chatId.trim();
  if (!chatId) {
    throw new Error('chatId is required');
  }
  const threadId = target.threadId?.trim();
  return {
    chatId,
    threadId: threadId && threadId.length > 0 ? threadId : undefined,
  };
};
