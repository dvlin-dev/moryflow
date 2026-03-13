/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AutomationEndpoint, AutomationJob } from '@moryflow/automations-core';

type AnyRecord = Record<string, unknown>;

const mockStores = vi.hoisted(() => new Map<string, AnyRecord>());

vi.mock('electron-store', () => {
  class MockStore<T extends AnyRecord> {
    private readonly name: string;
    private readonly defaults: T;

    constructor(options?: { name?: string; defaults?: T }) {
      this.name = options?.name ?? 'default';
      this.defaults = structuredClone((options?.defaults ?? {}) as AnyRecord) as T;
      if (!mockStores.has(this.name)) {
        mockStores.set(this.name, structuredClone(this.defaults as AnyRecord));
      }
    }

    get<K extends keyof T>(key: K): T[K] {
      return ((mockStores.get(this.name) ?? {}) as T)[key];
    }

    set<K extends keyof T>(key: K, value: T[K]): void {
      if (value === undefined) {
        throw new TypeError('Use `delete()` to clear values');
      }
      const current = structuredClone((mockStores.get(this.name) ?? {}) as AnyRecord);
      current[key as string] = structuredClone(value as AnyRecord);
      mockStores.set(this.name, current);
    }

    get store(): T {
      return structuredClone((mockStores.get(this.name) ?? {}) as T);
    }

    set store(value: T) {
      mockStores.set(this.name, structuredClone(value as AnyRecord));
    }
  }

  return {
    default: MockStore,
  };
});

const createJob = (): AutomationJob => ({
  id: 'job-1',
  name: 'Daily summary',
  enabled: true,
  source: {
    kind: 'conversation-session',
    origin: 'conversation-entry',
    vaultPath: '/tmp/workspace',
    displayTitle: 'Inbox',
    sessionId: 'session-1',
  },
  schedule: {
    kind: 'every',
    intervalMs: 60_000,
  },
  payload: {
    kind: 'agent-turn',
    message: 'Summarize updates',
    contextDepth: 6,
  },
  delivery: {
    mode: 'push',
    endpointId: 'endpoint-1',
  },
  executionPolicy: {
    approvalMode: 'unattended',
    toolPolicy: { allow: [{ tool: 'Read' }] },
    networkPolicy: { mode: 'deny' },
    fileSystemPolicy: { mode: 'vault_only' },
    requiresExplicitConfirmation: true,
  },
  state: {
    nextRunAt: 1_000,
  },
  createdAt: 1,
  updatedAt: 1,
});

const createEndpoint = (): AutomationEndpoint => ({
  id: 'endpoint-1',
  channel: 'telegram',
  accountId: 'account-1',
  label: 'My Telegram',
  target: {
    kind: 'telegram',
    chatId: 'chat-1',
    threadId: '42',
    peerKey: 'peer-1',
    threadKey: 'thread-1',
    title: 'Topic 42',
  },
  verifiedAt: '2026-03-13T00:00:00.000Z',
  replySessionId: 'reply-session-1',
});

describe('automation store', () => {
  beforeEach(() => {
    vi.resetModules();
    mockStores.clear();
  });

  it('supports job create/update/delete/list/get', async () => {
    const { createAutomationStore } = await import('./store.js');
    const store = createAutomationStore();

    const created = store.saveJob(createJob());
    expect(store.listJobs()).toEqual([created]);
    expect(store.getJob(created.id)).toEqual(created);

    const updated = store.saveJob({
      ...created,
      enabled: false,
      updatedAt: 2,
      state: {
        ...created.state,
        lastRunStatus: 'ok',
      },
    });

    expect(store.getJob(updated.id)).toEqual(updated);

    store.removeJob(updated.id);
    expect(store.listJobs()).toEqual([]);
    expect(store.getJob(updated.id)).toBeNull();
  });

  it('persists canonical thread keys and replySessionId on endpoints', async () => {
    const { createAutomationStore } = await import('./store.js');
    const store = createAutomationStore();

    const endpoint = store.saveEndpoint(createEndpoint());

    expect(store.getEndpoint(endpoint.id)).toEqual(endpoint);
    expect(store.getEndpoint(endpoint.id)?.target.peerKey).toBe('peer-1');
    expect(store.getEndpoint(endpoint.id)?.target.threadKey).toBe('thread-1');
    expect(store.getEndpoint(endpoint.id)?.replySessionId).toBe('reply-session-1');
  });

  it('supports default endpoint selection and cleanup', async () => {
    const { createAutomationStore } = await import('./store.js');
    const store = createAutomationStore();
    const endpoint = store.saveEndpoint(createEndpoint());

    store.setDefaultEndpoint(endpoint.id);
    expect(store.getDefaultEndpoint()?.id).toBe(endpoint.id);

    store.removeEndpoint(endpoint.id);
    expect(store.getDefaultEndpoint()).toBeNull();
  });
});
