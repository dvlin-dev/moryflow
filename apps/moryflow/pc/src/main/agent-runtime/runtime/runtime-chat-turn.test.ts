/* @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runMock = vi.fn();

describe('createRuntimeChatTurnRunner', () => {
  beforeEach(() => {
    vi.resetModules();
    runMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('将 toolStreamBridge 接到 createToolStreamHandle', async () => {
    vi.doMock('@openai/agents-core', () => ({
      run: runMock,
      user: vi.fn((content: unknown) => ({ role: 'user', content })),
    }));

    vi.doMock('@moryflow/agents-runtime', () => ({
      applyContextToInput: vi.fn((input: string) => input),
      buildUserContent: vi.fn((input: string) => input),
      mergeRuntimeConfig: vi.fn((base: unknown) => base),
    }));

    const emitted: Array<Record<string, unknown>> = [];

    runMock.mockImplementation(async (_agent, _input, options) => {
      const handle = options.context.createToolStreamHandle?.({
        toolCallId: 'call-1',
        toolName: 'bash',
      });
      handle?.emit({
        kind: 'progress',
        message: 'running',
        timestamp: 1,
        startedAt: 1,
      });
      return {
        completed: Promise.resolve(),
        output: [],
        state: {},
        [Symbol.asyncIterator]: async function* () {},
      };
    });

    const { createRuntimeChatTurnRunner } = await import('./runtime-chat-turn.js');

    const runChatTurn = createRuntimeChatTurnRunner({
      runtimeConfig: {} as never,
      resolveRuntimeVaultRoot: vi.fn(async () => '/vault'),
      skillsRegistry: {
        ensureReady: vi.fn(async () => undefined),
        getAvailableSkillsPrompt: vi.fn(() => ''),
        resolveSelectedSkillInjection: vi.fn(async () => null),
      },
      ensureExternalTools: vi.fn(async () => undefined),
      memoryRuntime: {
        refreshTooling: vi.fn(async () => ({
          state: 'enabled',
          canRead: true,
          canWrite: true,
          canReadKnowledgeFile: true,
          workspaceId: 'ws-1',
          vaultPath: '/vault',
          profileKey: 'user:client',
        })),
        refreshPromptBlock: vi.fn(async () => undefined),
      } as never,
      getAgentFactory: () => ({
        getAgent: () => ({
          agent: { tools: [{ name: 'bash' }] },
          modelId: 'gpt-5',
        }),
        invalidate: vi.fn(),
      }),
      getModelFactory: () =>
        ({
          buildModel: vi.fn(() => ({
            resolvedThinkingLevel: 'off',
            thinkingDowngradedToOff: false,
            providerOptions: undefined,
          })),
          providers: [],
        }) as never,
      getEffectiveHistory: vi.fn(async () => []),
      maxAgentTurns: 10,
    });

    await runChatTurn({
      chatId: 'chat-1',
      input: 'hello',
      session: {
        addItems: vi.fn(async () => undefined),
      } as never,
      toolStreamBridge: {
        emit: (event) => emitted.push(event as Record<string, unknown>),
      },
    });

    expect(runMock).toHaveBeenCalledTimes(1);
    expect(emitted).toEqual([
      expect.objectContaining({
        kind: 'progress',
        toolCallId: 'call-1',
        toolName: 'bash',
        message: 'running',
      }),
    ]);
  });
});
