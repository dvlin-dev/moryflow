/**
 * Digest Notification Service Tests
 *
 * [PROVIDES]: DigestNotificationService 单元测试
 * [POS]: 测试 Webhook/Email 通知调度逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DigestNotificationService } from '../../services/notification.service';
import {
  createMockPrisma,
  createMockConfigService,
  createMockQueue,
  type MockPrismaDigest,
  type MockConfigService,
  type MockQueue,
} from '../mocks';
import { NOTIFICATION } from '../../digest.constants';

describe('DigestNotificationService', () => {
  let service: DigestNotificationService;
  let mockPrisma: MockPrismaDigest;
  let mockConfig: MockConfigService;
  let mockWebhookQueue: MockQueue;
  let mockEmailQueue: MockQueue;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockConfig = createMockConfigService({
      ANYHUNT_WWW_URL: 'https://anyhunt.app',
    });
    mockWebhookQueue = createMockQueue();
    mockEmailQueue = createMockQueue();

    service = new DigestNotificationService(
      mockPrisma as any,
      mockConfig as any,
      mockWebhookQueue as any,
      mockEmailQueue as any,
    );
  });

  // ========== onRunCompleted ==========

  describe('onRunCompleted', () => {
    const baseEvent = {
      runId: 'run-1',
      subscriptionId: 'sub-1',
      userId: 'user-1',
      status: 'completed' as const,
      itemsDelivered: 5,
      narrativeMarkdown: '## Digest Summary',
      items: [
        {
          title: 'Article 1',
          url: 'https://example.com/1',
          aiSummary: 'Summary 1',
          scoreOverall: 80,
        },
        {
          title: 'Article 2',
          url: 'https://example.com/2',
          aiSummary: 'Summary 2',
          scoreOverall: 75,
        },
      ],
    };

    it('should return empty result when subscription not found', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue(null);

      const result = await service.onRunCompleted(baseEvent);

      expect(result.webhookEnqueued).toBe(false);
      expect(result.emailEnqueued).toBe(false);
    });

    it('should enqueue webhook when enabled', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        name: 'Test Subscription',
        webhookEnabled: true,
        webhookUrl: 'https://example.com/webhook',
        emailEnabled: false,
        emailTo: null,
      });
      mockWebhookQueue.add.mockResolvedValue({ id: 'webhook-job-1' });

      const result = await service.onRunCompleted(baseEvent);

      expect(result.webhookEnqueued).toBe(true);
      expect(result.webhookJobId).toBe('webhook-job-1');
      expect(mockWebhookQueue.add).toHaveBeenCalledWith(
        'deliver',
        expect.objectContaining({
          runId: 'run-1',
          subscriptionId: 'sub-1',
          webhookUrl: 'https://example.com/webhook',
          event: 'digest.run.completed',
          payload: expect.objectContaining({
            status: 'completed',
            itemsDelivered: 5,
          }),
        }),
        expect.objectContaining({
          jobId: 'digest-webhook-run-1',
          attempts: NOTIFICATION.webhookMaxRetries,
          backoff: expect.objectContaining({
            type: 'exponential',
            delay: NOTIFICATION.webhookRetryDelayMs,
          }),
        }),
      );
    });

    it('should not enqueue webhook when disabled', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        name: 'Test',
        webhookEnabled: false,
        webhookUrl: 'https://example.com/webhook',
        emailEnabled: false,
        emailTo: null,
      });

      const result = await service.onRunCompleted(baseEvent);

      expect(result.webhookEnqueued).toBe(false);
      expect(mockWebhookQueue.add).not.toHaveBeenCalled();
    });

    it('should not enqueue webhook when URL is null', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        name: 'Test',
        webhookEnabled: true,
        webhookUrl: null,
        emailEnabled: false,
        emailTo: null,
      });

      const result = await service.onRunCompleted(baseEvent);

      expect(result.webhookEnqueued).toBe(false);
    });

    it('should enqueue email when enabled', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        name: 'AI News',
        webhookEnabled: false,
        webhookUrl: null,
        emailEnabled: true,
        emailTo: 'user@example.com',
        emailSubjectTemplate: null,
      });
      mockEmailQueue.add.mockResolvedValue({ id: 'email-job-1' });

      const result = await service.onRunCompleted(baseEvent);

      expect(result.emailEnqueued).toBe(true);
      expect(result.emailJobId).toBe('email-job-1');
      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'deliver',
        expect.objectContaining({
          runId: 'run-1',
          emailTo: 'user@example.com',
          emailSubject: 'Your Digest: AI News - 5 new items',
          subscriptionName: 'AI News',
          itemsCount: 5,
          viewUrl:
            'https://anyhunt.app/inbox?subscriptionId=sub-1&state=UNREAD',
          unsubscribeUrl: 'https://anyhunt.app/subscriptions/sub-1',
        }),
        expect.objectContaining({
          jobId: 'digest-email-run-1',
          attempts: NOTIFICATION.emailMaxRetries,
        }),
      );
    });

    it('should not enqueue email for failed runs', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        name: 'Test',
        webhookEnabled: false,
        webhookUrl: null,
        emailEnabled: true,
        emailTo: 'user@example.com',
        emailSubjectTemplate: null,
      });

      const failedEvent = { ...baseEvent, status: 'failed' as const };
      const result = await service.onRunCompleted(failedEvent);

      expect(result.emailEnqueued).toBe(false);
      expect(mockEmailQueue.add).not.toHaveBeenCalled();
    });

    it('should use email subject template when provided', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        name: 'AI News',
        webhookEnabled: false,
        webhookUrl: null,
        emailEnabled: true,
        emailTo: 'user@example.com',
        emailSubjectTemplate: '[{{name}}] {{count}} new items - {{date}}',
      });
      mockEmailQueue.add.mockResolvedValue({ id: 'email-job-1' });

      await service.onRunCompleted(baseEvent);

      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'deliver',
        expect.objectContaining({
          emailSubject: expect.stringMatching(
            /\[AI News\] 5 new items - \d+\/\d+\/\d+/,
          ),
        }),
        expect.objectContaining({
          jobId: 'digest-email-run-1',
        }),
      );
    });

    it('should enqueue both webhook and email when both enabled', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        name: 'Test',
        webhookEnabled: true,
        webhookUrl: 'https://example.com/webhook',
        emailEnabled: true,
        emailTo: 'user@example.com',
        emailSubjectTemplate: null,
      });
      mockWebhookQueue.add.mockResolvedValue({ id: 'webhook-job-1' });
      mockEmailQueue.add.mockResolvedValue({ id: 'email-job-1' });

      const result = await service.onRunCompleted(baseEvent);

      expect(result.webhookEnqueued).toBe(true);
      expect(result.emailEnqueued).toBe(true);
    });

    it('should use digest.run.failed event for failed runs', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        name: 'Test',
        webhookEnabled: true,
        webhookUrl: 'https://example.com/webhook',
        emailEnabled: false,
        emailTo: null,
      });
      mockWebhookQueue.add.mockResolvedValue({ id: 'webhook-job-1' });

      const failedEvent = {
        ...baseEvent,
        status: 'failed' as const,
        error: 'Search failed',
      };
      await service.onRunCompleted(failedEvent);

      expect(mockWebhookQueue.add).toHaveBeenCalledWith(
        'deliver',
        expect.objectContaining({
          event: 'digest.run.failed',
        }),
        expect.objectContaining({
          jobId: 'digest-webhook-run-1',
        }),
      );
    });

    it('should handle webhook queue error gracefully', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        name: 'Test',
        webhookEnabled: true,
        webhookUrl: 'https://example.com/webhook',
        emailEnabled: true,
        emailTo: 'user@example.com',
        emailSubjectTemplate: null,
      });
      mockWebhookQueue.add.mockRejectedValue(new Error('Queue error'));
      mockEmailQueue.add.mockResolvedValue({ id: 'email-job-1' });

      const result = await service.onRunCompleted(baseEvent);

      expect(result.webhookEnqueued).toBe(false);
      expect(result.emailEnqueued).toBe(true);
    });

    it('should handle email queue error gracefully', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        name: 'Test',
        webhookEnabled: true,
        webhookUrl: 'https://example.com/webhook',
        emailEnabled: true,
        emailTo: 'user@example.com',
        emailSubjectTemplate: null,
      });
      mockWebhookQueue.add.mockResolvedValue({ id: 'webhook-job-1' });
      mockEmailQueue.add.mockRejectedValue(new Error('Queue error'));

      const result = await service.onRunCompleted(baseEvent);

      expect(result.webhookEnqueued).toBe(true);
      expect(result.emailEnqueued).toBe(false);
    });

    it('should include narrative in webhook payload', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        name: 'Test',
        webhookEnabled: true,
        webhookUrl: 'https://example.com/webhook',
        emailEnabled: false,
        emailTo: null,
      });
      mockWebhookQueue.add.mockResolvedValue({ id: 'webhook-job-1' });

      await service.onRunCompleted(baseEvent);

      expect(mockWebhookQueue.add).toHaveBeenCalledWith(
        'deliver',
        expect.objectContaining({
          payload: expect.objectContaining({
            narrativeMarkdown: '## Digest Summary',
          }),
        }),
        expect.objectContaining({
          jobId: 'digest-webhook-run-1',
        }),
      );
    });

    it('should include items in email payload', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        name: 'Test',
        webhookEnabled: false,
        webhookUrl: null,
        emailEnabled: true,
        emailTo: 'user@example.com',
        emailSubjectTemplate: null,
      });
      mockEmailQueue.add.mockResolvedValue({ id: 'email-job-1' });

      await service.onRunCompleted(baseEvent);

      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'deliver',
        expect.objectContaining({
          items: [
            {
              title: 'Article 1',
              url: 'https://example.com/1',
              aiSummary: 'Summary 1',
            },
            {
              title: 'Article 2',
              url: 'https://example.com/2',
              aiSummary: 'Summary 2',
            },
          ],
        }),
        expect.objectContaining({
          jobId: 'digest-email-run-1',
        }),
      );
    });
  });
});
