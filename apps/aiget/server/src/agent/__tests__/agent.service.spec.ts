/**
 * AgentService 单元测试
 * 验证 credits 分段扣减与结算逻辑
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentService } from '../agent.service';
import { run } from '@aiget/agents-core';
import type { BrowserAgentPortService } from '../../browser/ports';
import type { QuotaService } from '../../quota/quota.service';

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

const createStreamResult = (usage: {
  inputTokens: number;
  outputTokens: number;
}) => {
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
    },
    finalOutput: { ok: true },
  };
};

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
    } as unknown as QuotaService;

    mockRun.mockResolvedValue(
      createStreamResult({ inputTokens: 100000, outputTokens: 0 }) as never,
    );

    const service = new AgentService(mockBrowserPort, mockQuotaService);

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
});
