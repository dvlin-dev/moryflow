/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import type { AgentInputItem } from '@openai/agents-core';
import type { AutomationJob } from '@moryflow/automations-core';
import { createAutomationRunner } from './runner.js';

const createHistoryItem = (role: 'user' | 'assistant', text: string): AgentInputItem =>
  ({
    type: 'message',
    role,
    content: [{ type: role === 'assistant' ? 'output_text' : 'input_text', text }],
  }) as unknown as AgentInputItem;

const createJob = (source: AutomationJob['source']): AutomationJob => ({
  id: 'job-1',
  name: 'Daily summary',
  enabled: true,
  source,
  schedule: {
    kind: 'every',
    intervalMs: 60_000,
  },
  payload: {
    kind: 'agent-turn',
    message: 'Summarize the latest updates',
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
    toolPolicy: {
      allow: [{ tool: 'Read' }],
    },
    networkPolicy: {
      mode: 'deny',
    },
    fileSystemPolicy: {
      mode: 'vault_only',
    },
    requiresExplicitConfirmation: true,
  },
  state: {},
  createdAt: 1,
  updatedAt: 1,
});

const createRunResult = (input: { deltas: string[]; finalOutput?: string }) => {
  const iterator = async function* () {
    for (const delta of input.deltas) {
      yield {
        type: 'raw_model_stream_event',
        data: { type: 'output_text_delta', delta },
      };
    }
  };

  return {
    result: {
      [Symbol.asyncIterator]: iterator,
      completed: Promise.resolve(),
      finalOutput: input.finalOutput,
      output: [createHistoryItem('assistant', input.finalOutput ?? input.deltas.join(''))],
      state: {} as never,
    },
    agent: { tools: [] } as never,
    toolNames: [],
    thinkingResolution: {
      requested: undefined,
      resolvedLevel: 'off',
      downgradedToOff: false,
    },
  };
};

describe('automation runner', () => {
  it('conversation-session source reads the latest 6 turns and appends run output back to source history', async () => {
    const sourceHistory = Array.from({ length: 8 }, (_, index) => [
      createHistoryItem('user', `User ${index + 1}`),
      createHistoryItem('assistant', `Assistant ${index + 1}`),
    ]).flat();
    const chatStore = {
      getHistory: vi.fn(() => sourceHistory),
      appendHistory: vi.fn(),
    };
    const contextStore = {
      getHistory: vi.fn(() => []),
      appendHistory: vi.fn(),
    };
    const runtime = {
      runChatTurn: vi.fn(async (options) => {
        const items = await options.session.getItems();
        expect(items).toHaveLength(12);
        expect(options.mode).toBe('ask');
        expect(options.approvalMode).toBe('deny_on_ask');
        expect(options.runtimeConfigOverride?.permission?.rules).toBeDefined();
        return createRunResult({
          deltas: ['Hello ', 'world'],
          finalOutput: 'Hello world',
        });
      }),
    };

    const runner = createAutomationRunner({
      runtime,
      chatSessionStore: chatStore as never,
      contextStore: contextStore as never,
      now: () => 10,
      withVaultRoot: async (_vaultPath, task) => task(),
      generateRunId: () => 'run-1',
    });

    const result = await runner.runAutomationTurn(
      createJob({
        kind: 'conversation-session',
        origin: 'conversation-entry',
        vaultPath: '/tmp/workspace',
        displayTitle: 'Inbox',
        sessionId: 'session-1',
      })
    );

    expect(result.outputText).toBe('Hello world');
    expect(chatStore.appendHistory).toHaveBeenCalledTimes(1);
    expect(chatStore.appendHistory).toHaveBeenCalledWith(
      'session-1',
      expect.arrayContaining([
        expect.objectContaining({ role: 'user' }),
        expect.objectContaining({ role: 'assistant' }),
      ])
    );
  });

  it('automation-context source reads its own recent context and still runs in isolated mode', async () => {
    const contextHistory = Array.from({ length: 4 }, (_, index) => [
      createHistoryItem('user', `Context user ${index + 1}`),
      createHistoryItem('assistant', `Context assistant ${index + 1}`),
    ]).flat();
    const contextStore = {
      getHistory: vi.fn(() => contextHistory),
      appendHistory: vi.fn(),
    };
    const runtime = {
      runChatTurn: vi.fn(async (options) => {
        expect(await options.session.getItems()).toHaveLength(8);
        return createRunResult({
          deltas: [],
          finalOutput: 'Context output',
        });
      }),
    };

    const runner = createAutomationRunner({
      runtime,
      chatSessionStore: {
        getHistory: vi.fn(),
        appendHistory: vi.fn(),
      } as never,
      contextStore: contextStore as never,
      now: () => 10,
      withVaultRoot: async (_vaultPath, task) => task(),
      generateRunId: () => 'run-2',
    });

    const result = await runner.runAutomationTurn(
      createJob({
        kind: 'automation-context',
        origin: 'automations-module',
        vaultPath: '/tmp/workspace',
        displayTitle: 'Automation context',
        contextId: 'context-1',
      })
    );

    expect(result.outputText).toBe('Context output');
    expect(contextStore.appendHistory).toHaveBeenCalledWith(
      'context-1',
      expect.arrayContaining([
        expect.objectContaining({ role: 'user' }),
        expect.objectContaining({ role: 'assistant' }),
      ])
    );
  });

  it('source conversation missing degrades to payload-only run and records source_missing warning', async () => {
    const runtime = {
      runChatTurn: vi.fn(async (options) => {
        expect(await options.session.getItems()).toEqual([]);
        return createRunResult({
          deltas: [],
          finalOutput: 'Payload only',
        });
      }),
    };

    const runner = createAutomationRunner({
      runtime,
      chatSessionStore: {
        getHistory: vi.fn(() => {
          throw new Error('missing');
        }),
        appendHistory: vi.fn(() => {
          throw new Error('should not append');
        }),
      } as never,
      contextStore: {
        getHistory: vi.fn(),
        appendHistory: vi.fn(),
      } as never,
      now: () => 100,
      withVaultRoot: async (_vaultPath, task) => task(),
      generateRunId: () => 'run-3',
    });

    const result = await runner.runAutomationTurn(
      createJob({
        kind: 'conversation-session',
        origin: 'conversation-entry',
        vaultPath: '/tmp/workspace',
        displayTitle: 'Inbox',
        sessionId: 'missing-session',
      })
    );

    expect(result.outputText).toBe('Payload only');
    expect(result.runRecord.warningCode).toBe('source_missing');
    expect(result.nextState.lastWarningCode).toBe('source_missing');
  });
});
