/**
 * AgentService 单元测试
 * 验证 credits 分段扣减与结算逻辑
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentService } from '../agent.service';
import { AgentBillingService } from '../agent-billing.service';
import { AgentStreamProcessor } from '../agent-stream.processor';
import { run, type StreamRunOptions } from '@anyhunt/agents-core';
import type { BrowserAgentPortService } from '../../browser/ports';
import type { AgentTaskRepository } from '../agent-task.repository';
import type { AgentTaskProgressStore } from '../agent-task.progress.store';
import type { BrowserAgentContext } from '../tools';
import type { LlmRoutingService } from '../../llm';

vi.mock('@anyhunt/agents-core', async () => {
  const actual = await vi.importActual<typeof import('@anyhunt/agents-core')>(
    '@anyhunt/agents-core',
  );
  return {
    ...actual,
    run: vi.fn(),
  };
});

const mockRun = vi.mocked(run);

const createStreamResult = (
  usage: { inputTokens: number; outputTokens: number },
  options?: { throwAfterFirst?: boolean },
) => {
  const events = [
    {
      type: 'run_item_stream_event',
      item: {
        type: 'tool_call_output_item',
        rawItem: {},
      },
    },
  ];

  return {
    state: {
      _context: {
        usage,
      },
    },
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event as unknown;
      }
      if (options?.throwAfterFirst) {
        throw new Error('stream failed');
      }
    },
    finalOutput: { ok: true },
  };
};

const createStreamResultNoToolCalls = (usage: {
  inputTokens: number;
  outputTokens: number;
}) => {
  return {
    state: {
      _context: {
        usage,
      },
    },
    async *[Symbol.asyncIterator]() {
      // no-op
    },
    finalOutput: { ok: true },
  };
};

const createMockTaskRepository = (): AgentTaskRepository =>
  ({
    createTask: vi.fn().mockResolvedValue({}),
    updateTask: vi.fn().mockResolvedValue({}),
    updateTaskIfStatus: vi.fn().mockResolvedValue(true),
    updateTaskMetrics: vi.fn().mockResolvedValue(undefined),
    createCharge: vi.fn().mockResolvedValue({}),
    listCharges: vi.fn().mockResolvedValue([]),
    markChargeRefunded: vi.fn().mockResolvedValue({}),
    getTaskForUser: vi.fn().mockResolvedValue(null),
  }) as unknown as AgentTaskRepository;

const createMockProgressStore = (): AgentTaskProgressStore =>
  ({
    setProgress: vi.fn().mockResolvedValue(undefined),
    getProgress: vi.fn().mockResolvedValue(null),
    clearProgress: vi.fn().mockResolvedValue(undefined),
    requestCancel: vi.fn().mockResolvedValue(undefined),
    isCancelRequested: vi.fn().mockResolvedValue(false),
    clearCancel: vi.fn().mockResolvedValue(undefined),
  }) as unknown as AgentTaskProgressStore;

const createMockStreamProcessor = (
  progressStore: AgentTaskProgressStore,
  billingService: AgentBillingService,
): AgentStreamProcessor =>
  new AgentStreamProcessor(progressStore, billingService);

const createMockBillingService = (): AgentBillingService => {
  return {
    createBillingParams: vi
      .fn()
      .mockImplementation((startTime: Date, maxCredits?: number) => ({
        maxCredits,
        currentCredits: 1,
        toolCallCount: 0,
        startTime,
        chargedCredits: 0,
      })),
    buildProgress: vi.fn().mockImplementation((billing) => ({
      creditsUsed: billing.currentCredits,
      toolCallCount: billing.toolCallCount,
      elapsedMs: Date.now() - billing.startTime.getTime(),
    })),
    updateBillingFromUsage: vi.fn().mockImplementation((billing, usage) => {
      if (usage) {
        const tokens = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
        billing.currentCredits = 1 + Math.ceil(tokens / 1000);
      }
    }),
    calculateCreditsFromStream: vi
      .fn()
      .mockImplementation((result, billing) => {
        const usage = result.state?._context?.usage;
        if (usage) {
          const tokens = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
          return 1 + Math.ceil(tokens / 1000);
        }
        return billing?.currentCredits ?? 1;
      }),
    checkCreditsLimit: vi.fn(),
    ensureMinimumQuota: vi.fn().mockResolvedValue(undefined),
    applyQuotaCheckpoint: vi.fn().mockImplementation(async (_, __, billing) => {
      while (billing.currentCredits - billing.chargedCredits >= 100) {
        billing.chargedCredits += 100;
      }
    }),
    settleCharges: vi.fn().mockResolvedValue(undefined),
    refundChargesOnFailure: vi.fn().mockResolvedValue(undefined),
    estimateCost: vi.fn().mockReturnValue({
      estimatedCredits: 10,
      breakdown: {
        base: 1,
        tokenEstimate: 5,
        toolCallEstimate: 2,
        durationEstimate: 2,
      },
    }),
  } as unknown as AgentBillingService;
};

const createMockBrowserPortService = (): BrowserAgentPortService => {
  const port = {
    createSession: vi.fn().mockResolvedValue({
      id: 'session_1',
      createdAt: '',
      expiresAt: '',
    }),
    closeSession: vi.fn().mockResolvedValue(undefined),
    openUrl: vi.fn(),
    snapshot: vi.fn(),
    executeAction: vi.fn(),
    search: vi.fn(),
  };

  return {
    forUser: vi.fn().mockReturnValue(port),
  } as unknown as BrowserAgentPortService;
};

const createMockLlmRoutingService = (): LlmRoutingService =>
  ({
    resolveModel: vi.fn().mockResolvedValue({
      requestedModelId: 'gpt-4o',
      upstreamModelId: 'gpt-4o',
      provider: {
        id: 'p1',
        providerType: 'openai',
        name: 'OpenAI',
        baseUrl: null,
      },
      model: {} as never,
    }),
  }) as unknown as LlmRoutingService;

describe('AgentService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-14T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('deducts credits in 100-credit checkpoints and settles remainder', async () => {
    const mockBrowserPort = createMockBrowserPortService();

    const mockBillingService = createMockBillingService();

    mockRun.mockResolvedValue(
      createStreamResult({ inputTokens: 100000, outputTokens: 0 }) as never,
    );

    const mockProgressStore = createMockProgressStore();
    const service = new AgentService(
      mockBrowserPort,
      createMockLlmRoutingService(),
      mockBillingService,
      createMockTaskRepository(),
      mockProgressStore,
      createMockStreamProcessor(mockProgressStore, mockBillingService),
    );

    const result = await service.executeTask(
      {
        prompt: 'test',
        stream: false,
        output: { type: 'text' },
      },
      'user_1',
    );

    expect(result.status).toBe('completed');
    expect(result.creditsUsed).toBe(101);
    expect(mockBillingService.applyQuotaCheckpoint).toHaveBeenCalled();
    expect(mockBillingService.settleCharges).toHaveBeenCalledWith(
      'user_1',
      expect.any(String),
      expect.any(Object),
      101,
    );
  });

  it('refunds checkpoint charges on failure', async () => {
    const mockBrowserPort = createMockBrowserPortService();

    const mockBillingService = createMockBillingService();

    mockRun.mockResolvedValue(
      createStreamResult(
        { inputTokens: 100000, outputTokens: 0 },
        { throwAfterFirst: true },
      ) as never,
    );

    const mockTaskRepository = createMockTaskRepository();
    const mockProgressStore = createMockProgressStore();

    const service = new AgentService(
      mockBrowserPort,
      createMockLlmRoutingService(),
      mockBillingService,
      mockTaskRepository,
      mockProgressStore,
      createMockStreamProcessor(mockProgressStore, mockBillingService),
    );

    const result = await service.executeTask(
      {
        prompt: 'test',
        stream: false,
        output: { type: 'text' },
      },
      'user_1',
    );

    expect(result.status).toBe('failed');
    expect(mockBillingService.refundChargesOnFailure).toHaveBeenCalledWith(
      'user_1',
      expect.any(String),
    );
  });

  it('creates browser session only when tools are used', async () => {
    const mockBrowserPort = createMockBrowserPortService();
    const mockBillingService = createMockBillingService();

    mockRun.mockImplementation(
      async (
        _agent,
        _prompt,
        options?: StreamRunOptions<BrowserAgentContext>,
      ) => {
        const context = options?.context as BrowserAgentContext | undefined;
        if (!context) {
          throw new Error('Missing agent context');
        }
        await context.getSessionId();
        return createStreamResult({ inputTokens: 0, outputTokens: 0 }) as never;
      },
    );

    const mockProgressStore = createMockProgressStore();
    const service = new AgentService(
      mockBrowserPort,
      createMockLlmRoutingService(),
      mockBillingService,
      createMockTaskRepository(),
      mockProgressStore,
      createMockStreamProcessor(mockProgressStore, mockBillingService),
    );

    await service.executeTask(
      { prompt: 'test', stream: false, output: { type: 'text' } },
      'user_1',
    );

    const port = vi.mocked(mockBrowserPort.forUser).mock.results[0]
      ?.value as unknown as {
      createSession: ReturnType<typeof vi.fn>;
      closeSession: ReturnType<typeof vi.fn>;
    };
    expect(port.createSession).toHaveBeenCalledTimes(1);
    expect(port.closeSession).toHaveBeenCalledTimes(1);
    expect(port.closeSession).toHaveBeenCalledWith('session_1');
  });

  it('does not create browser session when no tools are used', async () => {
    const mockBrowserPort = createMockBrowserPortService();
    const mockBillingService = createMockBillingService();

    mockRun.mockResolvedValue(
      createStreamResultNoToolCalls({
        inputTokens: 0,
        outputTokens: 0,
      }) as never,
    );

    const mockProgressStore = createMockProgressStore();
    const service = new AgentService(
      mockBrowserPort,
      createMockLlmRoutingService(),
      mockBillingService,
      createMockTaskRepository(),
      mockProgressStore,
      createMockStreamProcessor(mockProgressStore, mockBillingService),
    );

    await service.executeTask(
      { prompt: 'test', stream: false, output: { type: 'text' } },
      'user_1',
    );

    const port = vi.mocked(mockBrowserPort.forUser).mock.results[0]
      ?.value as unknown as {
      createSession: ReturnType<typeof vi.fn>;
      closeSession: ReturnType<typeof vi.fn>;
    };
    expect(port.createSession).not.toHaveBeenCalled();
    expect(port.closeSession).not.toHaveBeenCalled();
  });

  it('marks task cancelled when cancel flag is set during execution', async () => {
    const mockBrowserPort = createMockBrowserPortService();

    const mockBillingService = createMockBillingService();

    const mockTaskRepository = createMockTaskRepository();
    const mockProgressStore = createMockProgressStore();
    vi.mocked(mockProgressStore.isCancelRequested).mockResolvedValue(true);

    mockRun.mockResolvedValue(
      createStreamResult({ inputTokens: 0, outputTokens: 0 }) as never,
    );

    const service = new AgentService(
      mockBrowserPort,
      createMockLlmRoutingService(),
      mockBillingService,
      mockTaskRepository,
      mockProgressStore,
      createMockStreamProcessor(mockProgressStore, mockBillingService),
    );

    const result = await service.executeTask(
      {
        prompt: 'test',
        stream: false,
        output: { type: 'text' },
      },
      'user_1',
    );

    expect(result.status).toBe('cancelled');
    expect(mockTaskRepository.updateTaskIfStatus).toHaveBeenCalledWith(
      expect.any(String),
      ['PENDING', 'PROCESSING'],
      expect.objectContaining({ status: 'CANCELLED' }),
    );
    expect(mockTaskRepository.updateTask).not.toHaveBeenCalled();
  });

  it('fails fast when model routing fails (no browser session)', async () => {
    const mockBrowserPort = createMockBrowserPortService();
    const mockBillingService = createMockBillingService();
    const mockTaskRepository = createMockTaskRepository();
    const mockProgressStore = createMockProgressStore();

    const mockRouting = createMockLlmRoutingService();
    vi.mocked(mockRouting.resolveModel).mockRejectedValue(
      new Error('Model is not available'),
    );

    const service = new AgentService(
      mockBrowserPort,
      mockRouting,
      mockBillingService,
      mockTaskRepository,
      mockProgressStore,
      createMockStreamProcessor(mockProgressStore, mockBillingService),
    );

    const result = await service.executeTask(
      { prompt: 'test', stream: false, output: { type: 'text' } },
      'user_1',
    );

    expect(result.status).toBe('failed');
    expect(result.creditsUsed).toBe(0);
    expect(result.error).toMatch(/Model is not available/);

    expect(vi.mocked(mockBrowserPort.forUser)).not.toHaveBeenCalled();
    expect(mockBillingService.ensureMinimumQuota).not.toHaveBeenCalled();
    expect(mockTaskRepository.updateTaskIfStatus).toHaveBeenCalledWith(
      expect.any(String),
      ['PENDING'],
      expect.objectContaining({
        status: 'FAILED',
        creditsUsed: 0,
      }),
    );
  });

  it('requests cancel and returns latest progress credits', async () => {
    const mockBrowserPort = createMockBrowserPortService();

    const mockBillingService = createMockBillingService();

    const mockTaskRepository = createMockTaskRepository();
    vi.mocked(mockTaskRepository.getTaskForUser).mockResolvedValue({
      id: 'task_1',
      userId: 'user_1',
      status: 'PROCESSING',
      input: {},
      result: null,
      error: null,
      creditsUsed: null,
      toolCallCount: null,
      elapsedMs: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: new Date(),
      completedAt: null,
      cancelledAt: null,
    });

    const mockProgressStore = createMockProgressStore();
    vi.mocked(mockProgressStore.getProgress).mockResolvedValue({
      creditsUsed: 12,
      toolCallCount: 3,
      elapsedMs: 1000,
    });

    const service = new AgentService(
      mockBrowserPort,
      createMockLlmRoutingService(),
      mockBillingService,
      mockTaskRepository,
      mockProgressStore,
      createMockStreamProcessor(mockProgressStore, mockBillingService),
    );

    const result = await service.cancelTask('task_1', 'user_1');

    expect(result.success).toBe(true);
    expect(result.creditsUsed).toBe(12);
    expect(mockProgressStore.requestCancel).toHaveBeenCalledWith('task_1');
    expect(mockTaskRepository.updateTaskIfStatus).toHaveBeenCalledWith(
      'task_1',
      ['PENDING', 'PROCESSING'],
      expect.objectContaining({ status: 'CANCELLED' }),
    );
  });

  it('rejects cancel when task is already completed', async () => {
    const mockBrowserPort = createMockBrowserPortService();

    const mockBillingService = createMockBillingService();

    const mockTaskRepository = createMockTaskRepository();
    vi.mocked(mockTaskRepository.getTaskForUser).mockResolvedValue({
      id: 'task_2',
      userId: 'user_1',
      status: 'COMPLETED',
      input: {},
      result: null,
      error: null,
      creditsUsed: 5,
      toolCallCount: 1,
      elapsedMs: 500,
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: new Date(),
      completedAt: new Date(),
      cancelledAt: null,
    });

    const mockProgressStore = createMockProgressStore();
    const service = new AgentService(
      mockBrowserPort,
      createMockLlmRoutingService(),
      mockBillingService,
      mockTaskRepository,
      mockProgressStore,
      createMockStreamProcessor(mockProgressStore, mockBillingService),
    );

    const result = await service.cancelTask('task_2', 'user_1');

    expect(result.success).toBe(false);
    expect(result.message).toContain('Cannot cancel');
    expect(result.creditsUsed).toBe(5);
  });

  it('overrides chat-completions response_format for text output (gateway compat)', async () => {
    const mockBrowserPort = createMockBrowserPortService();
    const mockBillingService = createMockBillingService();
    const mockProgressStore = createMockProgressStore();

    mockRun.mockResolvedValue(
      createStreamResultNoToolCalls({
        inputTokens: 10,
        outputTokens: 0,
      }) as never,
    );

    const service = new AgentService(
      mockBrowserPort,
      createMockLlmRoutingService(),
      mockBillingService,
      createMockTaskRepository(),
      mockProgressStore,
      createMockStreamProcessor(mockProgressStore, mockBillingService),
    );

    await service.executeTask(
      { prompt: 'test', stream: false, output: { type: 'text' } },
      'user_1',
    );

    const agent = mockRun.mock.calls[0]?.[0] as any;
    expect(agent?.modelSettings?.providerData).toHaveProperty(
      'response_format',
      undefined,
    );
  });

  it('does not override response_format when structured schema is requested', async () => {
    const mockBrowserPort = createMockBrowserPortService();
    const mockBillingService = createMockBillingService();
    const mockProgressStore = createMockProgressStore();

    mockRun.mockResolvedValue(
      createStreamResultNoToolCalls({
        inputTokens: 10,
        outputTokens: 0,
      }) as never,
    );

    const service = new AgentService(
      mockBrowserPort,
      createMockLlmRoutingService(),
      mockBillingService,
      createMockTaskRepository(),
      mockProgressStore,
      createMockStreamProcessor(mockProgressStore, mockBillingService),
    );

    await service.executeTask(
      {
        prompt: 'test',
        stream: false,
        output: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: { title: { type: 'string' } },
            required: ['title'],
            additionalProperties: false,
          },
        },
      },
      'user_1',
    );

    const agent = mockRun.mock.calls[0]?.[0] as any;
    expect(agent?.modelSettings?.providerData).toBeUndefined();
  });
});
