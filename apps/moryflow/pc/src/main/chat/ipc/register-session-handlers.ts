import { ipcMain } from 'electron';
import { createChatSession } from '../../agent-runtime/index.js';
import { chatSessionStore } from '../../chat-session-store/index.js';
import { resolveChatSessionProfileKey } from '../../chat-session-store/scope.js';
import { agentHistoryToUiMessages } from '../../chat-session-store/ui-message.js';
import { getStoredVault } from '../../vault.js';
import {
  assertSessionVisibleInCurrentScope,
  listVisibleSessions,
} from '../application/session-visibility.js';
import { resolveSessionMessagesSnapshot } from '../application/resolveSessionMessagesSnapshot.js';
import { broadcastMessageEvent, broadcastSessionEvent } from '../services/broadcast/event-bus.js';
import { getRuntime } from '../services/runtime.js';
import type { RegisterChatHandlersContext } from './register-context.js';

export const registerChatSessionHandlers = ({
  activeStreams,
  broadcastMessageSnapshot,
}: RegisterChatHandlersContext) => {
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
        throw new Error('Incomplete rename payload.');
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
        throw new Error('Incomplete title generation payload.');
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
      throw new Error('Incomplete delete payload.');
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
      throw new Error('Missing sessionId.');
    }
    await assertSessionVisibleInCurrentScope(sessionId);
    return resolveSessionMessagesSnapshot(sessionId);
  });

  ipcMain.handle(
    'chat:sessions:prepareCompaction',
    async (_event, payload: { sessionId: string; preferredModelId?: string }) => {
      const { sessionId, preferredModelId } = payload ?? {};
      if (!sessionId) {
        throw new Error('Missing sessionId.');
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
        throw new Error('Incomplete truncate payload.');
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
        throw new Error('Incomplete replace-message payload.');
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
        throw new Error('Incomplete fork payload.');
      }
      await assertSessionVisibleInCurrentScope(sessionId);
      const newSession = chatSessionStore.fork(sessionId, atIndex);
      broadcastSessionEvent({ type: 'created', session: newSession });
      broadcastMessageSnapshot(newSession.id);
      return newSession;
    }
  );
};
