/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentInputItem } from '@openai/agents-core';
import { createAutomationContextStore } from './context-store.js';
import { chatSessionStore } from '../chat-session-store/handle.js';

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
      const current = structuredClone((mockStores.get(this.name) ?? {}) as AnyRecord);
      current[key as string] = structuredClone(value as AnyRecord);
      mockStores.set(this.name, current);
    }
  }

  return {
    default: MockStore,
  };
});

const createAgentItem = (role: 'user' | 'assistant', text: string): AgentInputItem =>
  ({
    type: 'message',
    role,
    content: [{ type: 'input_text', text }],
  }) as unknown as AgentInputItem;

describe('automation context store', () => {
  beforeEach(() => {
    mockStores.clear();
  });

  it('creates, lists and reads contexts without polluting chat session list', () => {
    const contextStore = createAutomationContextStore();

    const created = contextStore.create({
      vaultPath: '/tmp/workspace',
      title: 'New automation',
    });

    expect(contextStore.get(created.id)?.title).toBe('New automation');
    expect(contextStore.list().map((item) => item.id)).toEqual([created.id]);
    expect(chatSessionStore.list()).toEqual([]);
  });

  it('appends history, reads recent history and exposes a Session-compatible adapter', async () => {
    const contextStore = createAutomationContextStore();
    const context = contextStore.create({
      vaultPath: '/tmp/workspace',
      title: 'Daily summary',
    });

    contextStore.appendHistory(context.id, [
      createAgentItem('user', 'Prompt 1'),
      createAgentItem('assistant', 'Reply 1'),
      createAgentItem('user', 'Prompt 2'),
      createAgentItem('assistant', 'Reply 2'),
    ]);

    expect(contextStore.getRecentHistory(context.id, 2)).toHaveLength(2);

    const session = contextStore.toSession(context.id);

    expect(await session.getSessionId()).toBe(context.id);
    expect(await session.getItems()).toHaveLength(4);

    await session.addItems([createAgentItem('user', 'Prompt 3')]);
    expect(await session.getItems()).toHaveLength(5);

    const popped = await session.popItem();
    expect(popped).toBeDefined();
    expect(await session.getItems()).toHaveLength(4);

    await session.clearSession();
    expect(await session.getItems()).toEqual([]);
  });

  it('caps persisted history to the most recent 200 items', () => {
    const contextStore = createAutomationContextStore();
    const context = contextStore.create({
      vaultPath: '/tmp/workspace',
      title: 'Long running automation',
    });

    const items = Array.from({ length: 220 }, (_, index) =>
      createAgentItem(index % 2 === 0 ? 'user' : 'assistant', `Item ${index + 1}`)
    );

    contextStore.appendHistory(context.id, items);

    const history = contextStore.getHistory(context.id);
    expect(history).toHaveLength(200);
    expect(history[0]).toMatchObject({
      content: [{ text: 'Item 21' }],
    });
    expect(history.at(-1)).toMatchObject({
      content: [{ text: 'Item 220' }],
    });
  });
});
