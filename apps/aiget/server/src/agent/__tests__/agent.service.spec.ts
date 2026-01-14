/**
 * AgentService 单元测试
 * 验证 credits 分段扣减与结算逻辑
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentService } from '../agent.service';
import { run } from '@aiget/agents-core';
import type { BrowserAgentPortService } from '../../browser/ports';
import type { QuotaService } from '../../quota/quota.service';
import type { AgentTaskRepository } from '../agent-task.repository';
import type { AgentTaskProgressStore } from '../agent-task.progress.store';

vi.mock('@aiget/agents-core', async () => {
  const actual =
    await vi.importActual<typeof import('@aiget/agents-core')>(
      '@aiget/agents-core',
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
    const mockBrowserPort = {
      createSession: vi.fn().mockResolvedValue({
        id: 'session_1',
        createdAt: '',
        expiresAt: '',
      }),
      closeSession: vi.fn().mockResolvedValue(undefined),
    } as unknown as BrowserAgentPortService;

    const mockQuotaService = {
      getStatus: vi.fn().mockResolvedValue({
        monthly: { limit: 0, used: 0, remaining: 0 },
        purchased: 1000,
        totalRemaining: 1000,
        periodEndsAt: new Date('2026-02-01'),
        periodStartsAt: new Date('2026-01-01'),
      }),
      deductOrThrow: vi.fn().mockResolvedValue({
        success: true,
        source: 'MONTHLY',
        balanceBefore: 1000,
        balanceAfter: 900,
        transactionId: 'tx_1',
      }),
      refund: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as QuotaService;

    mockRun.mockResolvedValue(
      createStreamResult({ inputTokens: 100000, outputTokens: 0 }) as never,
    );

    const service = new AgentService(
      mockBrowserPort,
      mockQuotaService,
      createMockTaskRepository(),
      createMockProgressStore(),
    );

    const result = await service.executeTask(
      {
        prompt: 'test',
        stream: false,
      },
      'user_1',
    );

    expect(result.status).toBe('completed');
    expect(result.creditsUsed).toBe(101);
    expect(mockQuotaService.deductOrThrow).toHaveBeenNthCalledWith(
      1,
      'user_1',
      100,
      expect.stringContaining('checkpoint:100'),
    );
    expect(mockQuotaService.deductOrThrow).toHaveBeenNthCalledWith(
      2,
      'user_1',
      1,
      expect.stringContaining('final'),
    );
  });

  it('refunds checkpoint charges on failure', async () => {
    const mockBrowserPort = {
      createSession: vi.fn().mockResolvedValue({
        id: 'session_1',
        createdAt: '',
        expiresAt: '',
      }),
      closeSession: vi.fn().mockResolvedValue(undefined),
    } as unknown as BrowserAgentPortService;

    const mockQuotaService = {
      getStatus: vi.fn().mockResolvedValue({
        monthly: { limit: 0, used: 0, remaining: 0 },
        purchased: 1000,
        totalRemaining: 1000,
        periodEndsAt: new Date('2026-02-01'),
        periodStartsAt: new Date('2026-01-01'),
      }),
      deductOrThrow: vi.fn().mockResolvedValue({
        success: true,
        source: 'MONTHLY',
        balanceBefore: 1000,
        balanceAfter: 900,
        transactionId: 'tx_1',
      }),
      refund: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as QuotaService;

    mockRun.mockResolvedValue(
      createStreamResult(
        { inputTokens: 100000, outputTokens: 0 },
        { throwAfterFirst: true },
      ) as never,
    );

    const mockTaskRepository = createMockTaskRepository();
    vi.mocked(mockTaskRepository.listCharges).mockResolvedValue([
      {
        id: 'charge_1',
        taskId: 'task_1',
        userId: 'user_1',
        amount: 100,
        source: 'MONTHLY',
        transactionId: 'tx_1',
        referenceId: 'fetchx.agent:task_1:checkpoint:100',
        refundedAt: null,
        createdAt: new Date(),
      },
    ]);

    const service = new AgentService(
      mockBrowserPort,
      mockQuotaService,
      mockTaskRepository,
      createMockProgressStore(),
    );

    const result = await service.executeTask(
      {
        prompt: 'test',
        stream: false,
      },
      'user_1',
    );

    expect(result.status).toBe('failed');
    expect(mockQuotaService.refund).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        amount: 100,
        referenceId: expect.stringContaining('checkpoint:100'),
      }),
    );
  });

  it('marks task cancelled when cancel flag is set during execution', async () => {
    const mockBrowserPort = {
      createSession: vi.fn().mockResolvedValue({
        id: 'session_1',
        createdAt: '',
        expiresAt: '',
      }),
      closeSession: vi.fn().mockResolvedValue(undefined),
    } as unknown as BrowserAgentPortService;

    const mockQuotaService = {
      getStatus: vi.fn().mockResolvedValue({
        monthly: { limit: 0, used: 0, remaining: 0 },
        purchased: 1000,
        totalRemaining: 1000,
        periodEndsAt: new Date('2026-02-01'),
        periodStartsAt: new Date('2026-01-01'),
      }),
      deductOrThrow: vi.fn().mockResolvedValue({
        success: true,
        source: 'MONTHLY',
        balanceBefore: 1000,
        balanceAfter: 999,
        transactionId: 'tx_1',
      }),
      refund: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as QuotaService;

    const mockTaskRepository = createMockTaskRepository();
    const mockProgressStore = createMockProgressStore();
    vi.mocked(mockProgressStore.isCancelRequested).mockResolvedValue(true);

    mockRun.mockResolvedValue(
      createStreamResult({ inputTokens: 0, outputTokens: 0 }) as never,
    );

    const service = new AgentService(
      mockBrowserPort,
      mockQuotaService,
      mockTaskRepository,
      mockProgressStore,
    );

    const result = await service.executeTask(
      {
        prompt: 'test',
        stream: false,
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

  it('requests cancel and returns latest progress credits', async () => {
    const mockBrowserPort = {
      createSession: vi.fn(),
      closeSession: vi.fn(),
    } as unknown as BrowserAgentPortService;

    const mockQuotaService = {
      getStatus: vi.fn(),
      deductOrThrow: vi.fn(),
      refund: vi.fn(),
    } as unknown as QuotaService;

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
      mockQuotaService,
      mockTaskRepository,
      mockProgressStore,
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
    const mockBrowserPort = {
      createSession: vi.fn(),
      closeSession: vi.fn(),
    } as unknown as BrowserAgentPortService;

    const mockQuotaService = {
      getStatus: vi.fn(),
      deductOrThrow: vi.fn(),
      refund: vi.fn(),
    } as unknown as QuotaService;

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

    const service = new AgentService(
      mockBrowserPort,
      mockQuotaService,
      mockTaskRepository,
      createMockProgressStore(),
    );

    const result = await service.cancelTask('task_2', 'user_1');

    expect(result.success).toBe(false);
    expect(result.message).toContain('Cannot cancel');
    expect(result.creditsUsed).toBe(5);
  });
});
