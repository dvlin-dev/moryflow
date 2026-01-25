import { ipcMain } from 'electron';
import type { UIMessageChunk } from 'ai';

import type { AgentApplyEditInput } from '../../shared/ipc.js';
import { applyWriteOperation, writeOperationSchema } from '@anyhunt/agents-tools';
import { createVaultUtils } from '@anyhunt/agents-runtime';
import {
  createDesktopCapabilities,
  createDesktopCrypto,
} from '../agent-runtime/desktop-adapter.js';
import { getStoredVault } from '../vault.js';
import { chatSessionStore } from '../chat-session-store/index.js';
import { broadcastSessionEvent } from './broadcast.js';
import { createChatRequestHandler } from './chat-request.js';
import { approveToolRequest, clearApprovalGate } from './approval-store.js';
import { getRuntime } from './runtime.js';
import { createChatSession } from '../agent-runtime/index.js';

const sessions = new Map<
  string,
  { stream: ReadableStream<UIMessageChunk>; cancel: () => Promise<void> | void }
>();

export const registerChatHandlers = () => {
  const handleChatRequest = createChatRequestHandler(sessions);

  // 创建依赖实例用于 apply-edit
  const capabilities = createDesktopCapabilities();
  const crypto = createDesktopCrypto();
  const vaultUtils = createVaultUtils(capabilities, crypto, async () => {
    const vaultInfo = await getStoredVault();
    if (!vaultInfo) {
      throw new Error('尚未选择 Vault');
    }
    return vaultInfo.path;
  });

  ipcMain.handle('chat:agent-request', handleChatRequest);
  ipcMain.handle('chat:agent-stop', async (_event, payload) => {
    const { channel } = payload ?? {};
    if (!channel) {
      throw new Error('channel 缺失');
    }
    const entry = sessions.get(channel);
    if (entry) {
      try {
        await entry.cancel();
      } finally {
        sessions.delete(channel);
        clearApprovalGate(channel);
      }
    }
    return { ok: true };
  });

  ipcMain.handle('chat:sessions:list', () => {
    return chatSessionStore.list();
  });

  ipcMain.handle('chat:sessions:create', () => {
    const session = chatSessionStore.create();
    broadcastSessionEvent({ type: 'created', session });
    return session;
  });

  ipcMain.handle(
    'chat:sessions:rename',
    (_event, payload: { sessionId: string; title: string }) => {
      const { sessionId, title } = payload ?? {};
      if (!sessionId || typeof title !== 'string') {
        throw new Error('重命名参数不完整');
      }
      const session = chatSessionStore.rename(sessionId, title);
      broadcastSessionEvent({ type: 'updated', session });
      return session;
    }
  );

  // AI 生成会话标题
  ipcMain.handle(
    'chat:sessions:generateTitle',
    async (
      _event,
      payload: { sessionId: string; userMessage: string; preferredModelId?: string }
    ) => {
      const { sessionId, userMessage, preferredModelId } = payload ?? {};
      if (!sessionId || !userMessage) {
        throw new Error('生成标题参数不完整');
      }
      try {
        const runtime = getRuntime();
        const title = await runtime.generateTitle(userMessage, preferredModelId);
        const session = chatSessionStore.rename(sessionId, title);
        broadcastSessionEvent({ type: 'updated', session });
        return session;
      } catch (error) {
        // 静默失败，返回 null 表示生成失败
        console.error('[chat] generateTitle failed:', error);
        return null;
      }
    }
  );

  ipcMain.handle('chat:sessions:delete', (_event, payload: { sessionId: string }) => {
    const { sessionId } = payload ?? {};
    if (!sessionId) {
      throw new Error('删除参数不完整');
    }
    chatSessionStore.delete(sessionId);
    broadcastSessionEvent({ type: 'deleted', sessionId });
    return { ok: true };
  });

  ipcMain.handle('chat:sessions:getMessages', (_event, payload: { sessionId: string }) => {
    const { sessionId } = payload ?? {};
    if (!sessionId) {
      throw new Error('sessionId 缺失');
    }
    return chatSessionStore.getUiMessages(sessionId);
  });

  ipcMain.handle(
    'chat:sessions:prepareCompaction',
    async (_event, payload: { sessionId: string; preferredModelId?: string }) => {
      const { sessionId, preferredModelId } = payload ?? {};
      if (!sessionId) {
        throw new Error('sessionId 缺失');
      }
      const runtime = getRuntime();
      const session = createChatSession(sessionId);
      const compaction = await runtime.prepareCompaction({
        chatId: sessionId,
        preferredModelId,
        session,
      });
      if (!compaction.historyChanged) {
        return { changed: false };
      }
      const uiMessages = chatSessionStore.getUiMessages(sessionId);
      chatSessionStore.updateSessionMeta(sessionId, { uiMessages });
      return { changed: true, messages: uiMessages };
    }
  );

  ipcMain.handle(
    'chat:sessions:truncate',
    (_event, payload: { sessionId: string; index: number }) => {
      const { sessionId, index } = payload ?? {};
      if (!sessionId || typeof index !== 'number') {
        throw new Error('截断参数不完整');
      }
      chatSessionStore.truncateAt(sessionId, index);
      broadcastSessionEvent({ type: 'updated', session: chatSessionStore.getSummary(sessionId) });
      return { ok: true };
    }
  );

  ipcMain.handle(
    'chat:sessions:replaceMessage',
    (_event, payload: { sessionId: string; index: number; content: string }) => {
      const { sessionId, index, content } = payload ?? {};
      if (!sessionId || typeof index !== 'number' || typeof content !== 'string') {
        throw new Error('替换参数不完整');
      }
      chatSessionStore.replaceMessageAt(sessionId, index, content);
      broadcastSessionEvent({ type: 'updated', session: chatSessionStore.getSummary(sessionId) });
      return { ok: true };
    }
  );

  ipcMain.handle(
    'chat:sessions:fork',
    (_event, payload: { sessionId: string; atIndex: number }) => {
      const { sessionId, atIndex } = payload ?? {};
      if (!sessionId || typeof atIndex !== 'number') {
        throw new Error('分支参数不完整');
      }
      const newSession = chatSessionStore.fork(sessionId, atIndex);
      broadcastSessionEvent({ type: 'created', session: newSession });
      return newSession;
    }
  );

  ipcMain.handle('chat:apply-edit', async (_event, payload: AgentApplyEditInput) => {
    const operation = writeOperationSchema.parse(payload ?? {});
    try {
      const result = await applyWriteOperation(operation, {
        vaultUtils,
        fs: capabilities.fs,
        crypto,
      });
      return result;
    } catch (error) {
      console.error('[chat] apply-edit failed', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  });

  ipcMain.handle(
    'chat:approve-tool',
    async (_event, payload: { approvalId: string; remember?: 'once' | 'always' }) => {
      const { approvalId, remember } = payload ?? {};
      if (!approvalId) {
        throw new Error('Approval id is required.');
      }
      const rememberValue = remember === 'always' ? 'always' : 'once';
      await approveToolRequest({ approvalId, remember: rememberValue });
      return { ok: true };
    }
  );
};
