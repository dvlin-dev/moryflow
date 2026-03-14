/**
 * [INPUT]: Telegram thread + conversation binding/session 依赖
 * [OUTPUT]: 可执行的 conversationId 解析能力（ensure/new/self-heal）
 * [POS]: Telegram 线程到 PC 会话 ID 的单一映射边界
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { ThreadResolution } from '@moryflow/channels-core';
import path from 'node:path';

export type TelegramConversationBindingLookup = {
  conversationId: string;
};

export type TelegramConversationBindingsPort = {
  getByThread: (input: {
    channel: 'telegram';
    accountId: string;
    peerKey: string;
    threadKey: string;
  }) => Promise<TelegramConversationBindingLookup | null>;
  upsertByThread: (input: {
    channel: 'telegram';
    accountId: string;
    peerKey: string;
    threadKey: string;
    conversationId: string;
    updatedAt: string;
    peerTitle?: string;
    peerUsername?: string;
  }) => Promise<void>;
};

export type TelegramConversationSessionsPort = {
  createSession: (input: { vaultPath: string }) => {
    id: string;
  };
  deleteSession: (sessionId: string) => void;
  getSessionSummary: (sessionId: string) => {
    id: string;
  };
};

export type PeerMetadata = {
  title?: string;
  username?: string;
};

export type TelegramConversationService = {
  ensureConversationId: (thread: ThreadResolution, peerMetadata?: PeerMetadata) => Promise<string>;
  createNewConversationId: (thread: ThreadResolution) => Promise<string>;
};

export const createTelegramConversationService = (input: {
  accountId: string;
  bindings: TelegramConversationBindingsPort;
  sessions: TelegramConversationSessionsPort;
  resolveVaultPath: () => Promise<string>;
  now?: () => string;
}): TelegramConversationService => {
  const now = input.now ?? (() => new Date().toISOString());

  const bindConversation = async (
    thread: ThreadResolution,
    conversationId: string,
    peerMetadata?: PeerMetadata
  ): Promise<string> => {
    await input.bindings.upsertByThread({
      channel: 'telegram',
      accountId: input.accountId,
      peerKey: thread.peerKey,
      threadKey: thread.threadKey,
      conversationId,
      updatedAt: now(),
      peerTitle: peerMetadata?.title,
      peerUsername: peerMetadata?.username,
    });
    return conversationId;
  };

  const createConversation = async (): Promise<string> => {
    const vaultPath = (await input.resolveVaultPath()).trim();
    if (!vaultPath) {
      throw new Error('No workspace selected. Please select a workspace first.');
    }
    if (!path.isAbsolute(vaultPath)) {
      throw new Error('Workspace path is invalid. Please reselect your workspace.');
    }
    const created = input.sessions.createSession({
      vaultPath,
    });
    return created.id;
  };

  const createAndBindConversation = async (
    thread: ThreadResolution,
    peerMetadata?: PeerMetadata
  ): Promise<string> => {
    const conversationId = await createConversation();
    try {
      return await bindConversation(thread, conversationId, peerMetadata);
    } catch (error) {
      try {
        input.sessions.deleteSession(conversationId);
      } catch {
        // ignore rollback failure, preserve original binding error
      }
      throw error;
    }
  };

  const isSessionAlive = (sessionId: string): boolean => {
    try {
      const summary = input.sessions.getSessionSummary(sessionId);
      return summary.id.trim().length > 0;
    } catch {
      return false;
    }
  };

  return {
    ensureConversationId: async (thread, peerMetadata?) => {
      const existing = await input.bindings.getByThread({
        channel: 'telegram',
        accountId: input.accountId,
        peerKey: thread.peerKey,
        threadKey: thread.threadKey,
      });
      if (existing?.conversationId && isSessionAlive(existing.conversationId)) {
        if (peerMetadata && (peerMetadata.title || peerMetadata.username)) {
          await input.bindings.upsertByThread({
            channel: 'telegram',
            accountId: input.accountId,
            peerKey: thread.peerKey,
            threadKey: thread.threadKey,
            conversationId: existing.conversationId,
            updatedAt: now(),
            peerTitle: peerMetadata.title,
            peerUsername: peerMetadata.username,
          });
        }
        return existing.conversationId;
      }
      return createAndBindConversation(thread, peerMetadata);
    },
    createNewConversationId: async (thread) => {
      return createAndBindConversation(thread);
    },
  };
};
