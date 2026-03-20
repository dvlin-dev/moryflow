import { ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import type { ModeSwitchAuditEvent } from '@moryflow/agents-runtime';
import type { AgentApplyEditInput } from '../../../shared/ipc.js';
import { applyWriteOperation, writeOperationSchema } from '@moryflow/agents-tools';
import { createVaultUtils } from '@moryflow/agents-runtime';
import {
  createDesktopCapabilities,
  createDesktopCrypto,
} from '../../agent-runtime/desktop-adapter.js';
import { createChatSession } from '../../agent-runtime/index.js';
import { createDesktopModeSwitchAuditWriter } from '../../agent-runtime/mode-audit.js';
import {
  getGlobalPermissionMode,
  setGlobalPermissionMode,
} from '../../agent-runtime/runtime-config.js';
import { chatSessionStore } from '../../chat-session-store/index.js';
import { resolveChatSessionProfileKey } from '../../chat-session-store/scope.js';
import { agentHistoryToUiMessages } from '../../chat-session-store/ui-message.js';
import { getStoredVault } from '../../vault.js';
import { createChatRequestHandler } from '../application/createChatRequestHandler.js';
import {
  assertSessionVisibleInCurrentScope,
  listVisibleSessions,
} from '../application/session-visibility.js';
import { resolveSessionMessagesSnapshot } from '../application/resolveSessionMessagesSnapshot.js';
import { createActiveStreamRegistry } from '../services/active-stream-registry.js';
import {
  approveToolRequest,
  autoApprovePendingForSession,
  consumeFullAccessUpgradePromptReminder,
  getApprovalContext,
} from '../services/approval/approval-gate-store.js';
import {
  broadcastMessageEvent,
  broadcastSessionEvent,
  broadcastToRenderers,
} from '../services/broadcast/event-bus.js';
import { getRuntime } from '../services/runtime.js';

const activeStreams = createActiveStreamRegistry();

export const registerChatHandlers = () => {
  const handleChatRequest = createChatRequestHandler(activeStreams);
  const modeAuditWriter = createDesktopModeSwitchAuditWriter();
  const broadcastMessageSnapshot = (sessionId: string, persisted = true) => {
    broadcastMessageEvent({
      type: 'snapshot',
      sessionId,
      messages: chatSessionStore.getUiMessages(sessionId),
      persisted,
    });
  };

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
    await activeStreams.stopChannel(channel);
    return { ok: true };
  });

  ipcMain.handle('chat:sessions:list', async () => {
    return listVisibleSessions();
  });

  ipcMain.handle('chat:sessions:create', async () => {
    const vault = await getStoredVault();
    if (!vault?.path) {
      throw new Error('No workspace selected.');
    }
    const profileKey = await resolveChatSessionProfileKey(vault.path);
    const session = chatSessionStore.create({
      vaultPath: vault.path,
      profileKey,
    });
    broadcastSessionEvent({ type: 'created', session });
    broadcastMessageSnapshot(session.id);
    return session;
  });

  ipcMain.handle(
    'chat:sessions:rename',
    async (_event, payload: { sessionId: string; title: string }) => {
      const { sessionId, title } = payload ?? {};
      if (!sessionId || typeof title !== 'string') {
        throw new Error('重命名参数不完整');
      }
      await assertSessionVisibleInCurrentScope(sessionId);
      const session = chatSessionStore.rename(sessionId, title);
      broadcastSessionEvent({ type: 'updated', session });
      return session;
    }
  );

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
      await assertSessionVisibleInCurrentScope(sessionId);
      try {
        const runtime = getRuntime();
        const title = await runtime.generateTitle(userMessage, preferredModelId);
        const session = chatSessionStore.rename(sessionId, title);
        broadcastSessionEvent({ type: 'updated', session });
        return session;
      } catch (error) {
        console.error('[chat] generateTitle failed:', error);
        return null;
      }
    }
  );

  ipcMain.handle('chat:sessions:delete', async (_event, payload: { sessionId: string }) => {
    const { sessionId } = payload ?? {};
    if (!sessionId) {
      throw new Error('删除参数不完整');
    }
    await assertSessionVisibleInCurrentScope(sessionId);
    await activeStreams.stopSessionChannels(sessionId);
    chatSessionStore.delete(sessionId);
    broadcastSessionEvent({ type: 'deleted', sessionId });
    broadcastMessageEvent({ type: 'deleted', sessionId });
    return { ok: true };
  });

  ipcMain.handle('chat:sessions:getMessages', async (_event, payload: { sessionId: string }) => {
    const { sessionId } = payload ?? {};
    if (!sessionId) {
      throw new Error('sessionId 缺失');
    }
    await assertSessionVisibleInCurrentScope(sessionId);
    return resolveSessionMessagesSnapshot(sessionId);
  });

  ipcMain.handle('chat:permission:getGlobalMode', async () => {
    return getGlobalPermissionMode();
  });

  ipcMain.handle(
    'chat:permission:setGlobalMode',
    async (_event, payload: { mode: 'ask' | 'full_access'; sessionId?: string }) => {
      const { mode, sessionId } = payload ?? {};
      if (mode !== 'ask' && mode !== 'full_access') {
        throw new Error('Invalid global mode update request.');
      }

      const result = await setGlobalPermissionMode(mode);
      if (!result.changed) {
        return result.mode;
      }

      if (result.mode === 'full_access') {
        void Promise.allSettled(
          (await listVisibleSessions()).map((session) =>
            autoApprovePendingForSession({ sessionId: session.id })
          )
        ).then((settledResults) => {
          for (const settled of settledResults) {
            if (settled.status === 'rejected') {
              console.error('[chat] auto-approve pending approvals failed', settled.reason);
            }
          }
        });
      }

      const auditEvent: ModeSwitchAuditEvent = {
        eventId: randomUUID(),
        sessionId: sessionId && sessionId.trim().length > 0 ? sessionId : 'global',
        previousMode: result.previousMode,
        nextMode: result.mode,
        source: 'pc',
        timestamp: Date.now(),
      };
      void modeAuditWriter.append(auditEvent).catch((error) => {
        console.warn('[chat] mode audit failed', error);
      });

      broadcastToRenderers('chat:permission:global-mode-changed', { mode: result.mode });
      return result.mode;
    }
  );

  ipcMain.handle(
    'chat:sessions:prepareCompaction',
    async (_event, payload: { sessionId: string; preferredModelId?: string }) => {
      const { sessionId, preferredModelId } = payload ?? {};
      if (!sessionId) {
        throw new Error('sessionId 缺失');
      }
      await assertSessionVisibleInCurrentScope(sessionId);
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
      const uiMessages = agentHistoryToUiMessages(sessionId, compaction.history);
      chatSessionStore.updateSessionMeta(sessionId, { uiMessages });
      broadcastSessionEvent({ type: 'updated', session: chatSessionStore.getSummary(sessionId) });
      broadcastMessageSnapshot(sessionId);
      return { changed: true, messages: uiMessages };
    }
  );

  ipcMain.handle(
    'chat:sessions:truncate',
    async (_event, payload: { sessionId: string; index: number }) => {
      const { sessionId, index } = payload ?? {};
      if (!sessionId || typeof index !== 'number') {
        throw new Error('截断参数不完整');
      }
      await assertSessionVisibleInCurrentScope(sessionId);
      chatSessionStore.truncateAt(sessionId, index);
      broadcastSessionEvent({ type: 'updated', session: chatSessionStore.getSummary(sessionId) });
      broadcastMessageSnapshot(sessionId);
      return { ok: true };
    }
  );

  ipcMain.handle(
    'chat:sessions:replaceMessage',
    async (_event, payload: { sessionId: string; index: number; content: string }) => {
      const { sessionId, index, content } = payload ?? {};
      if (!sessionId || typeof index !== 'number' || typeof content !== 'string') {
        throw new Error('替换参数不完整');
      }
      await assertSessionVisibleInCurrentScope(sessionId);
      chatSessionStore.replaceMessageAt(sessionId, index, content);
      broadcastSessionEvent({ type: 'updated', session: chatSessionStore.getSummary(sessionId) });
      broadcastMessageSnapshot(sessionId);
      return { ok: true };
    }
  );

  ipcMain.handle(
    'chat:sessions:fork',
    async (_event, payload: { sessionId: string; atIndex: number }) => {
      const { sessionId, atIndex } = payload ?? {};
      if (!sessionId || typeof atIndex !== 'number') {
        throw new Error('分支参数不完整');
      }
      await assertSessionVisibleInCurrentScope(sessionId);
      const newSession = chatSessionStore.fork(sessionId, atIndex);
      broadcastSessionEvent({ type: 'created', session: newSession });
      broadcastMessageSnapshot(newSession.id);
      return newSession;
    }
  );

  ipcMain.handle('chat:apply-edit', async (_event, payload: AgentApplyEditInput) => {
    const operation = writeOperationSchema.parse(payload ?? {});
    try {
      return await applyWriteOperation(operation, {
        vaultUtils,
        fs: capabilities.fs,
        crypto,
      });
    } catch (error) {
      console.error('[chat] apply-edit failed', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  });

  ipcMain.handle(
    'chat:approve-tool',
    async (
      _event,
      payload: {
        approvalId: string;
        action: 'once' | 'allow_type' | 'deny';
      }
    ) => {
      const { approvalId, action } = payload ?? {};
      if (!approvalId || !action) {
        throw new Error('Approval id is required.');
      }
      return approveToolRequest({ approvalId, action });
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
