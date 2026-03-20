/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AutomationJob } from '@moryflow/automations-core';

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
    target: {
      channel: 'telegram',
      accountId: 'default',
      chatId: 'chat-1',
      label: 'Telegram chat-1',
    },
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

  it('notifies subscribers on writes and stops after unsubscribe', async () => {
    const { createAutomationStore } = await import('./store.js');
    const store = createAutomationStore();
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);
    store.saveJob(createJob());

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.removeJob('job-1');

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
