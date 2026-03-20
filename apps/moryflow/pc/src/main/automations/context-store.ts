import { randomUUID } from 'node:crypto';
import {
  automationContextRecordSchema,
  type AutomationContextRecord,
} from '@moryflow/automations-core';
import { createSessionAdapter, type Session, type SessionStore } from '@moryflow/agents-runtime';
import type { AgentInputItem } from '@openai/agents-core';
import { createDesktopStore } from '../storage/desktop-store.js';

type AutomationContextStoreShape = {
  contextsById: Record<string, AutomationContextRecord>;
};

const STORE_NAME = 'automation-contexts';
const MAX_HISTORY_ITEMS = 200;

const DEFAULT_STORE: AutomationContextStoreShape = {
  contextsById: {},
};

const cloneValue = <T>(value: T): T => structuredClone(value);

const normalizeContexts = (contextsById: Record<string, AutomationContextRecord> | undefined) => {
  const next: Record<string, AutomationContextRecord> = {};
  for (const [contextId, context] of Object.entries(contextsById ?? {})) {
    const parsed = automationContextRecordSchema.safeParse(context);
    if (!parsed.success) {
      continue;
    }
    next[contextId] = parsed.data;
  }
  return next;
};

export const createAutomationContextStore = () => {
  const store = createDesktopStore<AutomationContextStoreShape>({
    name: STORE_NAME,
    defaults: DEFAULT_STORE,
  });

  const readShape = (): AutomationContextStoreShape => ({
    contextsById: normalizeContexts(store.get('contextsById') ?? DEFAULT_STORE.contextsById),
  });

  const writeShape = (shape: AutomationContextStoreShape) => {
    store.set('contextsById', cloneValue(shape.contextsById));
  };

  const getRecordOrThrow = (contextId: string): AutomationContextRecord => {
    const record = readShape().contextsById[contextId];
    if (!record) {
      throw new Error('Automation context not found.');
    }
    return record;
  };

  const sessionStore: SessionStore = {
    async getSessions() {
      return [];
    },
    async createSession() {
      throw new Error('Automation contexts do not support createSession via SessionStore.');
    },
    async deleteSession() {
      throw new Error('Automation contexts do not support deleteSession via SessionStore.');
    },
    async getHistory(chatId) {
      return api.getHistory(chatId);
    },
    async appendHistory(chatId, items) {
      api.appendHistory(chatId, items);
    },
    async popHistory(chatId) {
      return api.popHistory(chatId);
    },
    async clearHistory(chatId) {
      api.clearHistory(chatId);
    },
  };

  const api = {
    list(): AutomationContextRecord[] {
      return Object.values(readShape().contextsById)
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .map(cloneValue);
    },
    create(input: { vaultPath: string; title: string }): AutomationContextRecord {
      const now = Date.now();
      const record = automationContextRecordSchema.parse({
        id: randomUUID(),
        vaultPath: input.vaultPath,
        title: input.title,
        history: [],
        createdAt: now,
        updatedAt: now,
      });
      const shape = readShape();
      shape.contextsById[record.id] = record;
      writeShape(shape);
      return cloneValue(record);
    },
    get(contextId: string): AutomationContextRecord | null {
      return cloneValue(readShape().contextsById[contextId] ?? null);
    },
    remove(contextId: string): void {
      const shape = readShape();
      delete shape.contextsById[contextId];
      writeShape(shape);
    },
    getHistory(contextId: string): AgentInputItem[] {
      return cloneValue(getRecordOrThrow(contextId).history);
    },
    getRecentHistory(contextId: string, limit: number): AgentInputItem[] {
      if (limit <= 0) {
        return [];
      }
      return cloneValue(getRecordOrThrow(contextId).history.slice(-limit));
    },
    appendHistory(contextId: string, items: AgentInputItem[]): void {
      const shape = readShape();
      const record = getRecordOrThrow(contextId);
      shape.contextsById[contextId] = automationContextRecordSchema.parse({
        ...record,
        history: [...record.history, ...items].slice(-MAX_HISTORY_ITEMS),
        updatedAt: Date.now(),
      });
      writeShape(shape);
    },
    popHistory(contextId: string): AgentInputItem | undefined {
      const shape = readShape();
      const record = getRecordOrThrow(contextId);
      const popped = record.history.at(-1);
      shape.contextsById[contextId] = automationContextRecordSchema.parse({
        ...record,
        history: popped ? record.history.slice(0, -1) : record.history,
        updatedAt: Date.now(),
      });
      writeShape(shape);
      return cloneValue(popped);
    },
    clearHistory(contextId: string): void {
      const shape = readShape();
      const record = getRecordOrThrow(contextId);
      shape.contextsById[contextId] = automationContextRecordSchema.parse({
        ...record,
        history: [],
        updatedAt: Date.now(),
      });
      writeShape(shape);
    },
    toSession(contextId: string): Session {
      getRecordOrThrow(contextId);
      return createSessionAdapter(contextId, sessionStore);
    },
    reset(): void {
      writeShape(DEFAULT_STORE);
    },
  };

  return api;
};

export type AutomationContextStore = ReturnType<typeof createAutomationContextStore>;
