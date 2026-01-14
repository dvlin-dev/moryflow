/**
 * Subscription Scheduler Processor Tests
 *
 * [PROVIDES]: SubscriptionSchedulerProcessor 单元测试
 * [POS]: 测试订阅调度器逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionSchedulerProcessor } from '../../processors/subscription-scheduler.processor';
import { createMockPrisma } from '../mocks';

describe('SubscriptionSchedulerProcessor', () => {
  let processor: SubscriptionSchedulerProcessor;
  let mockPrisma: any;
  let mockSubscriptionService: any;
  let mockRunService: any;
  let mockRunQueue: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();

    mockSubscriptionService = {
      findSubscriptionsToSchedule: vi.fn(),
      updateNextRunAt: vi.fn(),
    };

    mockRunService = {
      createRun: vi.fn(),
    };

    mockRunQueue = {
      add: vi.fn(),
    };

    processor = new SubscriptionSchedulerProcessor(
      mockPrisma as any,
      mockSubscriptionService as any,
      mockRunService as any,
      mockRunQueue as any,
    );
  });

  describe('process', () => {
    const mockJob = {};

    it('should schedule subscriptions to run', async () => {
      const subscriptions = [
        {
          id: 'sub-1',
          userId: 'user-1',
          cron: '0 9 * * *',
          timezone: 'UTC',
          outputLocale: 'en',
          languageMode: 'FIXED',
        },
        {
          id: 'sub-2',
          userId: 'user-2',
          cron: '0 18 * * *',
          timezone: 'Asia/Shanghai',
          outputLocale: null,
          languageMode: 'FOLLOW_UI',
        },
      ];

      mockSubscriptionService.findSubscriptionsToSchedule.mockResolvedValue(
        subscriptions,
      );
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ userPreference: null })
        .mockResolvedValueOnce({ userPreference: { uiLocale: 'zh-CN' } });
      mockRunService.createRun
        .mockResolvedValueOnce({ id: 'run-1' })
        .mockResolvedValueOnce({ id: 'run-2' });

      const result = await processor.process(mockJob as any);

      expect(result).toEqual({ scheduled: 2, total: 2 });
      expect(mockRunService.createRun).toHaveBeenCalledTimes(2);
      expect(mockRunQueue.add).toHaveBeenCalledTimes(2);
    });

    it('should return empty result when no subscriptions to schedule', async () => {
      mockSubscriptionService.findSubscriptionsToSchedule.mockResolvedValue([]);

      const result = await processor.process(mockJob as any);

      expect(result).toEqual({ scheduled: 0, total: 0 });
      expect(mockRunService.createRun).not.toHaveBeenCalled();
    });

    it('should use FOLLOW_UI locale when languageMode is FOLLOW_UI', async () => {
      mockSubscriptionService.findSubscriptionsToSchedule.mockResolvedValue([
        {
          id: 'sub-1',
          userId: 'user-1',
          cron: '0 9 * * *',
          timezone: 'UTC',
          outputLocale: 'en',
          languageMode: 'FOLLOW_UI',
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({
        userPreference: { uiLocale: 'zh-CN' },
      });
      mockRunService.createRun.mockResolvedValue({ id: 'run-1' });

      await processor.process(mockJob as any);

      expect(mockRunService.createRun).toHaveBeenCalledWith(
        'sub-1',
        'user-1',
        expect.any(Date),
        'SCHEDULED',
        'zh-CN',
      );
      expect(mockRunQueue.add).toHaveBeenCalledWith(
        'run',
        expect.objectContaining({
          outputLocale: 'zh-CN',
        }),
        expect.any(Object),
      );
    });

    it('should use outputLocale when languageMode is FIXED', async () => {
      mockSubscriptionService.findSubscriptionsToSchedule.mockResolvedValue([
        {
          id: 'sub-1',
          userId: 'user-1',
          cron: '0 9 * * *',
          timezone: 'UTC',
          outputLocale: 'ja',
          languageMode: 'FIXED',
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({
        userPreference: { uiLocale: 'zh-CN' },
      });
      mockRunService.createRun.mockResolvedValue({ id: 'run-1' });

      await processor.process(mockJob as any);

      expect(mockRunService.createRun).toHaveBeenCalledWith(
        'sub-1',
        'user-1',
        expect.any(Date),
        'SCHEDULED',
        'ja',
      );
    });

    it('should default to en when no locale available', async () => {
      mockSubscriptionService.findSubscriptionsToSchedule.mockResolvedValue([
        {
          id: 'sub-1',
          userId: 'user-1',
          cron: '0 9 * * *',
          timezone: 'UTC',
          outputLocale: null,
          languageMode: 'FOLLOW_UI',
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({
        userPreference: null,
      });
      mockRunService.createRun.mockResolvedValue({ id: 'run-1' });

      await processor.process(mockJob as any);

      expect(mockRunService.createRun).toHaveBeenCalledWith(
        'sub-1',
        'user-1',
        expect.any(Date),
        'SCHEDULED',
        'en',
      );
    });

    it('should update nextRunAt after scheduling', async () => {
      mockSubscriptionService.findSubscriptionsToSchedule.mockResolvedValue([
        {
          id: 'sub-1',
          userId: 'user-1',
          cron: '0 9 * * *',
          timezone: 'UTC',
          outputLocale: 'en',
          languageMode: 'FIXED',
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockRunService.createRun.mockResolvedValue({ id: 'run-1' });

      await processor.process(mockJob as any);

      expect(mockSubscriptionService.updateNextRunAt).toHaveBeenCalledWith(
        'sub-1',
        expect.any(Date),
      );
    });

    it('should add job to run queue with correct options', async () => {
      mockSubscriptionService.findSubscriptionsToSchedule.mockResolvedValue([
        {
          id: 'sub-1',
          userId: 'user-1',
          cron: '0 9 * * *',
          timezone: 'UTC',
          outputLocale: 'en',
          languageMode: 'FIXED',
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockRunService.createRun.mockResolvedValue({ id: 'run-1' });

      await processor.process(mockJob as any);

      expect(mockRunQueue.add).toHaveBeenCalledWith(
        'run',
        {
          subscriptionId: 'sub-1',
          runId: 'run-1',
          userId: 'user-1',
          outputLocale: 'en',
          source: 'SCHEDULED',
        },
        {
          jobId: 'sub-run-run-1',
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
    });

    it('should continue processing other subscriptions when one fails', async () => {
      mockSubscriptionService.findSubscriptionsToSchedule.mockResolvedValue([
        {
          id: 'sub-1',
          userId: 'user-1',
          cron: '0 9 * * *',
          timezone: 'UTC',
          outputLocale: 'en',
          languageMode: 'FIXED',
        },
        {
          id: 'sub-2',
          userId: 'user-2',
          cron: '0 9 * * *',
          timezone: 'UTC',
          outputLocale: 'en',
          languageMode: 'FIXED',
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockRunService.createRun
        .mockRejectedValueOnce(new Error('Failed to create run'))
        .mockResolvedValueOnce({ id: 'run-2' });

      const result = await processor.process(mockJob as any);

      expect(result).toEqual({ scheduled: 1, total: 2 });
    });

    it('should throw on fatal scheduler error', async () => {
      mockSubscriptionService.findSubscriptionsToSchedule.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(processor.process(mockJob as any)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
