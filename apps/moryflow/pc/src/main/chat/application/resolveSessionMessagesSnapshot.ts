import { chatSessionStore } from '../../chat-session-store/index.js';
import {
  getCurrentMessageRevision,
  getLatestMessageSnapshot,
} from '../services/broadcast/event-bus.js';

export const resolveSessionMessagesSnapshot = (sessionId: string) => {
  const latestSnapshot = getLatestMessageSnapshot(sessionId);
  if (latestSnapshot) {
    return {
      sessionId,
      messages: latestSnapshot.messages,
      revision: latestSnapshot.revision,
    };
  }
  return {
    sessionId,
    messages: chatSessionStore.getUiMessages(sessionId),
    revision: getCurrentMessageRevision(sessionId),
  };
};
