/**
 * [INPUT]: Chat IPC 请求与会话管理指令（含 runtime 默认 mode）
 * [OUTPUT]: 会话变更事件/执行结果
 * [POS]: PC 端聊天 IPC handlers
 * [UPDATE]: 2026-02-03 - 移除 chat:sessions:syncMessages IPC
 * [UPDATE]: 2026-03-03 - 新增审批上下文 IPC；full_access 切换后即时处理同会话挂起审批
 * [UPDATE]: 2026-03-03 - 新增首次升级提醒消费 IPC（仅在 UI 准备展示时消费）
 * [UPDATE]: 2026-03-03 - chat:sessions:updateMode 改为同步广播 + 异步自动放行，消除 await 竞态窗口
 * [UPDATE]: 2026-03-04 - 新增 `chat:message-event` 广播：会话正文与会话摘要解耦
 * [UPDATE]: 2026-03-05 - chat 正文协议增加 revision：防止初始加载覆盖实时快照
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { ipcMain } from 'electron';
import type { UIMessageChunk } from 'ai';

import type { AgentApplyEditInput } from '../../shared/ipc.js';
import { applyWriteOperation, writeOperationSchema } from '@moryflow/agents-tools';
import { createVaultUtils } from '@moryflow/agents-runtime';
import {
  createDesktopCapabilities,
  createDesktopCrypto,
} from '../agent-runtime/desktop-adapter.js';
import { getStoredVault } from '../vault.js';
import { chatSessionStore } from '../chat-session-store/index.js';
import { agentHistoryToUiMessages } from '../chat-session-store/ui-message.js';
import {
  broadcastMessageEvent,
  broadcastSessionEvent,
  getCurrentMessageRevision,
} from './broadcast.js';
import { createChatRequestHandler } from './chat-request.js';
import {
  approveToolRequest,
  autoApprovePendingForSession,
  clearApprovalGate,
  consumeFullAccessUpgradePromptReminder,
  getApprovalContext,
} from './approval-store.js';
import { getRuntime } from './runtime.js';
import { createChatSession } from '../agent-runtime/index.js';
import { createDesktopModeSwitchAuditWriter } from '../agent-runtime/mode-audit.js';
import { getRuntimeConfig } from '../agent-runtime/runtime-config.js';
import { updateSessionModeAndScheduleAutoApprove } from './session-mode-updater.js';

const sessions = new Map<
  string,
  { stream: ReadableStream<UIMessageChunk>; cancel: () => Promise<void> | void }
>();

export const registerChatHandlers = () => {
  const handleChatRequest = createChatRequestHandler(sessions);
  const modeAuditWriter = createDesktopModeSwitchAuditWriter();
  const broadcastMessageSnapshot = (sessionId: string, persisted = true) => {
    broadcastMessageEvent({
      type: 'snapshot',
      sessionId,
      messages: chatSessionStore.getUiMessages(sessionId),
      persisted,
    });
  };

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

  ipcMain.handle('chat:sessions:create', async () => {
    const runtimeConfig = await getRuntimeConfig();
    const vault = await getStoredVault();
    if (!vault?.path) {
      throw new Error('No workspace selected.');
    }
    const session = chatSessionStore.create({
      mode: runtimeConfig.mode?.default,
      vaultPath: vault.path,
    });
    broadcastSessionEvent({ type: 'created', session });
    broadcastMessageSnapshot(session.id);
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
    broadcastMessageEvent({ type: 'deleted', sessionId });
    return { ok: true };
  });

  ipcMain.handle('chat:sessions:getMessages', (_event, payload: { sessionId: string }) => {
    const { sessionId } = payload ?? {};
    if (!sessionId) {
      throw new Error('sessionId 缺失');
    }
    return {
      sessionId,
      messages: chatSessionStore.getUiMessages(sessionId),
      revision: getCurrentMessageRevision(sessionId),
    };
  });

  ipcMain.handle(
    'chat:sessions:updateMode',
    (_event, payload: { sessionId: string; mode: 'ask' | 'full_access' }) => {
      const { sessionId, mode } = payload ?? {};
      if (!sessionId || (mode !== 'ask' && mode !== 'full_access')) {
        throw new Error('Invalid session mode update request.');
      }
      return updateSessionModeAndScheduleAutoApprove({
        sessionId,
        mode,
        sessionStore: chatSessionStore,
        modeAuditWriter,
        autoApprovePendingForSession,
        broadcastSessionEvent,
      });
    }
  );

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
      // 从压缩后的历史重新生成 UI 消息，确保 UI 与 agent 历史一致
      const uiMessages = agentHistoryToUiMessages(sessionId, compaction.history);
      chatSessionStore.updateSessionMeta(sessionId, { uiMessages });
      broadcastSessionEvent({ type: 'updated', session: chatSessionStore.getSummary(sessionId) });
      broadcastMessageSnapshot(sessionId);
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
      broadcastMessageSnapshot(sessionId);
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
      broadcastMessageSnapshot(sessionId);
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
      broadcastMessageSnapshot(newSession.id);
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
      return approveToolRequest({ approvalId, remember: rememberValue });
    }
  );

  ipcMain.handle('chat:approvals:get-context', (_event, payload: { approvalId: string }) => {
    const { approvalId } = payload ?? {};
    if (!approvalId) {
      throw new Error('Approval id is required.');
    }
    return getApprovalContext({ approvalId });
  });

  ipcMain.handle('chat:approvals:consume-upgrade-prompt', () => {
    return consumeFullAccessUpgradePromptReminder();
  });
};
