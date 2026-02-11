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
        mode: 'agent',
      },
    };
  });

  it('clears uiMessages when history is cleared', () => {
    chatSessionStore.clearHistory('session');
    expect(sessions.session.history).toHaveLength(0);
    expect(sessions.session.uiMessages).toBeUndefined();
  });
});

describe('chatSessionStore.mode', () => {
  beforeEach(() => {
    sessions = {
      session: {
        id: 'session',
        title: 'Test',
        createdAt: 1,
        updatedAt: 1,
        history: [],
        mode: 'agent',
      },
    };
  });

  it('defaults mode to agent in summary', () => {
    const summary = chatSessionStore.getSummary('session');
    expect(summary.mode).toBe('agent');
  });

  it('updates mode via updateSessionMeta', () => {
    chatSessionStore.updateSessionMeta('session', { mode: 'full_access' });
    expect(sessions.session.mode).toBe('full_access');
  });
});

describe('chatSessionStore.create', () => {
  beforeEach(() => {
    sessions = {};
  });

  it('uses fixed english default title', () => {
    const created = chatSessionStore.create();
    expect(created.title).toBe('New thread');
  });

  it('keeps custom title when provided', () => {
    const created = chatSessionStore.create({ title: 'My custom thread' });
    expect(created.title).toBe('My custom thread');
  });
});
