import { chatSessionStore } from '../../chat-session-store/index.js';
import { resolveCurrentChatSessionScope } from '../../chat-session-store/scope.js';

export const listVisibleSessions = async () => {
  const scope = await resolveCurrentChatSessionScope();
  return scope ? chatSessionStore.list(scope) : chatSessionStore.list();
};

export const assertSessionVisibleInCurrentScope = async (sessionId: string) => {
  const visible = (await listVisibleSessions()).some((session) => session.id === sessionId);
  if (!visible) {
    throw new Error('会话不存在或不属于当前工作区');
  }
};
