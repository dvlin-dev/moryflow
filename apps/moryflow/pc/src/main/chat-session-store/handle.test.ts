import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentInputItem } from '@openai/agents-core';
import type { UIMessage } from 'ai';
import type { PersistedChatSession } from './const.js';

let sessions: Record<string, PersistedChatSession> = {};

vi.mock('./store.js', () => ({
  readSessions: () => sessions,
  writeSessions: (next: Record<string, PersistedChatSession>) => {
    sessions = next;
  },
  takeSequence: () => 1,
  resetStore: () => {
    sessions = {};
  },
}));

import { chatSessionStore } from './handle.js';

describe('chatSessionStore.clearHistory', () => {
  beforeEach(() => {
    const history: AgentInputItem[] = [{ role: 'user', content: 'hi' } as AgentInputItem];
    const uiMessages: UIMessage[] = [
      {
        id: 'session-0',
        role: 'user',
        parts: [{ type: 'text', text: 'hi' }],
      },
    ];
    sessions = {
      session: {
        id: 'session',
        title: 'Test',
        createdAt: 1,
        updatedAt: 1,
        history,
        uiMessages,
      },
    };
  });

  it('clears uiMessages when history is cleared', () => {
    chatSessionStore.clearHistory('session');
    expect(sessions.session.history).toHaveLength(0);
    expect(sessions.session.uiMessages).toBeUndefined();
  });
});
