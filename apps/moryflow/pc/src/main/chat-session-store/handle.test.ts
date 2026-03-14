import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentInputItem } from '@openai/agents-core';
import type { UIMessage } from 'ai';
import type { TaskState } from '@moryflow/agents-runtime';
import type { PersistedChatSession } from './const.js';

let sessions: Record<string, PersistedChatSession> = {};
const testVaultPath = '/vault';

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
        vaultPath: testVaultPath,
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

describe('chatSessionStore.create', () => {
  beforeEach(() => {
    sessions = {};
  });

  it('uses fixed english default title', () => {
    const created = chatSessionStore.create({ vaultPath: testVaultPath });
    expect(created.title).toBe('New thread');
    expect(created.vaultPath).toBe(testVaultPath);
  });

  it('keeps custom title when provided', () => {
    const created = chatSessionStore.create({
      title: 'My custom thread',
      vaultPath: testVaultPath,
    });
    expect(created.title).toBe('My custom thread');
  });

  it('isolates sessions by workspace profile', () => {
    const alpha = chatSessionStore.create({
      title: 'Alpha profile',
      vaultPath: testVaultPath,
      profileKey: 'user-a:workspace-1',
    });
    chatSessionStore.create({
      title: 'Beta profile',
      vaultPath: testVaultPath,
      profileKey: 'user-b:workspace-1',
    });

    expect(alpha.profileKey).toBe('user-a:workspace-1');
    expect(
      chatSessionStore.list({
        vaultPath: testVaultPath,
        profileKey: 'user-a:workspace-1',
      })
    ).toHaveLength(1);
    expect(
      chatSessionStore.list({
        vaultPath: testVaultPath,
        profileKey: 'user-b:workspace-1',
      })
    ).toHaveLength(1);
  });
});

describe('chatSessionStore taskState', () => {
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
        vaultPath: testVaultPath,
        history,
        uiMessages,
      },
    };
  });

  it('persists taskState in session summary', () => {
    const taskState: TaskState = {
      items: [{ id: 'task-1', title: 'Write docs', status: 'in_progress', note: 'now' }],
      updatedAt: 100,
    };

    const summary = chatSessionStore.setTaskState('session', taskState);

    expect(summary.taskState).toEqual(taskState);
    expect(chatSessionStore.getSummary('session').taskState).toEqual(taskState);
    expect(chatSessionStore.list()[0]?.taskState).toEqual(taskState);
  });

  it('copies taskState when forking a session', () => {
    const taskState: TaskState = {
      items: [
        { id: 'task-1', title: 'Step 1', status: 'done' },
        { id: 'task-2', title: 'Step 2', status: 'in_progress' },
      ],
      updatedAt: 200,
    };
    chatSessionStore.setTaskState('session', taskState);

    const forked = chatSessionStore.fork('session', 0);

    expect(forked.taskState).toEqual(taskState);
    expect(sessions[forked.id]?.taskState).toEqual(taskState);
  });

  it('keeps profileKey when forking a session', () => {
    sessions = {
      session: {
        id: 'session',
        title: 'Scoped',
        createdAt: 1,
        updatedAt: 1,
        vaultPath: testVaultPath,
        profileKey: 'user-a:workspace-1',
        history: [{ role: 'user', content: 'hi' } as AgentInputItem],
        uiMessages: [
          {
            id: 'session-0',
            role: 'user',
            parts: [{ type: 'text', text: 'hi' }],
          },
        ],
      },
    };

    const forked = chatSessionStore.fork('session', 0);

    expect(forked.profileKey).toBe('user-a:workspace-1');
    expect(sessions[forked.id]?.profileKey).toBe('user-a:workspace-1');
  });

  it('returns null for getSummaryInScope when session is outside the current profile scope', () => {
    sessions = {
      'session-a': {
        id: 'session-a',
        title: 'Alpha',
        createdAt: 1,
        updatedAt: 1,
        vaultPath: testVaultPath,
        profileKey: 'user-a:workspace-1',
        history: [],
      },
    };

    expect(
      chatSessionStore.getSummaryInScope('session-a', {
        vaultPath: testVaultPath,
        profileKey: 'user-b:workspace-1',
      }),
    ).toBeNull();
  });
});
