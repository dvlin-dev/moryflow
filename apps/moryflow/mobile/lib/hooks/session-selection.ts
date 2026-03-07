import type { ChatSessionSummary } from '@moryflow/agents-runtime';

export const resolveActiveSessionId = (
  activeSessionId: string | null,
  nextSessions: ChatSessionSummary[]
): string | null => {
  if (nextSessions.length === 0) {
    return null;
  }
  if (!activeSessionId) {
    return nextSessions[0].id;
  }
  return nextSessions.some((item) => item.id === activeSessionId)
    ? activeSessionId
    : nextSessions[0].id;
};
