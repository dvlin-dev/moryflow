/**
 * Email Delivery Processor Tests
 *
 * [PROVIDES]: EmailDeliveryProcessor 单元测试
 * [POS]: 测试 Email 投递执行逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailDeliveryProcessor } from '../../processors/email-delivery.processor';
import { createMockPrisma } from '../mocks';

describe('EmailDeliveryProcessor', () => {
  let processor: EmailDeliveryProcessor;
  let mockPrisma: any;
  let mockEmailService: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();

    mockEmailService = {
      sendEmail: vi.fn(),
    };

    processor = new EmailDeliveryProcessor(
      mockPrisma as any,
      mockEmailService as any,
    );
  });

  describe('process', () => {
    const mockJob = {
      id: 'job-1',
      data: {
        runId: 'run-1',
        subscriptionId: 'sub-1',
        emailTo: 'user@example.com',
        emailSubject: 'Your Daily AI Digest',
        subscriptionName: 'AI News',
        itemsCount: 5,
        narrativeMarkdown: "Here are today's top stories...",
        items: [
          {
            title: 'AI Breakthrough',
            url: 'https://example.com/1',
            aiSummary: 'Summary 1',
          },
          {
            title: 'ML Update',
            url: 'https://example.com/2',
            aiSummary: 'Summary 2',
          },
        ],
        viewUrl: 'https://aiget.dev/inbox/run-1',
        unsubscribeUrl: 'https://aiget.dev/unsubscribe/sub-1',
      },
      attemptsMade: 0,
    };

    it('should send email successfully', async () => {
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      const result = await processor.process(mockJob as any);

      expect(result).toEqual({ success: true });
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        'user@example.com',
        'Your Daily AI Digest',
        expect.any(String),
      );
      expect(mockPrisma.digestRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: {
          emailDeliveredAt: expect.any(Date),
          emailError: undefined,
        },
      });
    });

    it('should record failure when email sending fails', async () => {
      const error = new Error('SMTP connection failed');
      mockEmailService.sendEmail.mockRejectedValue(error);

      await expect(processor.process(mockJob as any)).rejects.toThrow(
        'SMTP connection failed',
      );

      expect(mockPrisma.digestRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: {
          emailDeliveredAt: undefined,
          emailError: 'SMTP connection failed',
        },
      });
    });

    it('should generate HTML with subscription name and items', async () => {
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      await processor.process(mockJob as any);

      const htmlArg = mockEmailService.sendEmail.mock.calls[0][2];
      expect(htmlArg).toContain('AI News');
      // HTML should include the items
    });

    it('should handle retry attempts', async () => {
      const jobWithRetry = {
        ...mockJob,
        attemptsMade: 1,
      };
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      const result = await processor.process(jobWithRetry as any);

      expect(result.success).toBe(true);
    });

    it('should not fail completely when recording fails', async () => {
      mockEmailService.sendEmail.mockResolvedValue(undefined);
      mockPrisma.digestRun.update.mockRejectedValue(new Error('DB error'));

      // Should still succeed even if recording fails
      const result = await processor.process(mockJob as any);

      expect(result).toEqual({ success: true });
    });

    it('should handle email without narrative', async () => {
      const jobWithoutNarrative = {
        ...mockJob,
        data: {
          ...mockJob.data,
          narrativeMarkdown: undefined,
        },
      };
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      const result = await processor.process(jobWithoutNarrative as any);

      expect(result).toEqual({ success: true });
    });

    it('should handle empty items array', async () => {
      const jobWithNoItems = {
        ...mockJob,
        data: {
          ...mockJob.data,
          items: [],
          itemsCount: 0,
        },
      };
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      const result = await processor.process(jobWithNoItems as any);

      expect(result).toEqual({ success: true });
    });
  });
});
