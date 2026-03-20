import type { ChatSessionEvent } from '../../../../shared/ipc.js';
import { searchIndexService } from '../../../search-index/index.js';
import { subscribeSessionEvents } from './event-bus.js';

let chatSessionSearchIndexSyncUnsubscribe: (() => void) | null = null;

export const handleChatSessionSearchIndexSync = async (event: ChatSessionEvent) => {
  if (event.type === 'deleted') {
    await searchIndexService.onSessionDelete(event.sessionId);
    return;
  }
  await searchIndexService.onSessionUpsert(event.session.id);
};

export const subscribeChatSessionSearchIndexSync = () => {
  if (chatSessionSearchIndexSyncUnsubscribe) {
    return chatSessionSearchIndexSyncUnsubscribe;
  }

  chatSessionSearchIndexSyncUnsubscribe = subscribeSessionEvents((event) => {
    void handleChatSessionSearchIndexSync(event).catch((error) => {
      if (event.type === 'deleted') {
        console.warn('[search-index] session delete failed', event.sessionId, error);
        return;
      }
      console.warn('[search-index] session upsert failed', event.session.id, error);
    });
  });

  return chatSessionSearchIndexSyncUnsubscribe;
};
