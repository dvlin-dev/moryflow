/**
 * Webhook Delivery Processor Tests
 *
 * [PROVIDES]: WebhookDeliveryProcessor 单元测试
 * [POS]: 测试 Webhook 投递执行逻辑（含 SSRF 防护）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnrecoverableError } from 'bullmq';
import { createHmac } from 'crypto';
import { WebhookDeliveryProcessor } from '../../processors/webhook-delivery.processor';
import { createMockPrisma } from '../mocks';

// Mock fetch
global.fetch = vi.fn();

const getHeader = (
  headers: HeadersInit | undefined,
  key: string,
): string | null => {
  if (!headers) return null;
  return new Headers(headers).get(key);
};

describe('WebhookDeliveryProcessor', () => {
  let processor: WebhookDeliveryProcessor;
  let mockPrisma: any;
  let mockUrlValidator: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    vi.clearAllMocks();

    mockUrlValidator = {
      isAllowed: vi.fn(),
    };

    processor = new WebhookDeliveryProcessor(
      mockPrisma as any,
      mockUrlValidator as any,
    );
  });

  describe('process', () => {
    const mockJob = {
      id: 'job-1',
      data: {
        runId: 'run-1',
        subscriptionId: 'sub-1',
        webhookUrl: 'https://webhook.example.com/digest',
        event: 'digest.run.completed',
        payload: {
          runId: 'run-1',
          itemsCount: 5,
          items: [{ title: 'Article', url: 'https://example.com' }],
        },
      },
      attemptsMade: 0,
    };

    it('should deliver webhook successfully', async () => {
      mockUrlValidator.isAllowed.mockResolvedValue(true);
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        webhookSecret: 'secret-123',
      });
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await processor.process(mockJob as any);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(mockPrisma.digestRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: {
          webhookDeliveredAt: expect.any(Date),
          webhookError: undefined,
          webhookStatusCode: 200,
          webhookLatencyMs: expect.any(Number),
        },
      });
    });

    it('should reject disallowed URLs (SSRF protection)', async () => {
      mockUrlValidator.isAllowed.mockResolvedValue(false);
      const localJob = {
        ...mockJob,
        data: {
          ...mockJob.data,
          webhookUrl: 'http://localhost:8080/webhook',
        },
      };

      await expect(processor.process(localJob as any)).rejects.toThrow(
        UnrecoverableError,
      );

      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockPrisma.digestRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({
          webhookError: expect.stringContaining('not allowed'),
        }),
      });
    });

    it('should include HMAC signature when webhookSecret is set', async () => {
      mockUrlValidator.isAllowed.mockResolvedValue(true);
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        webhookSecret: 'my-secret',
      });
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await processor.process(mockJob as any);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(getHeader(headers, 'X-Digest-Signature')).toMatch(/^sha256=/);
    });

    it('should sign the exact JSON string sent in request body', async () => {
      const webhookSecret = 'my-secret';
      mockUrlValidator.isAllowed.mockResolvedValue(true);
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        webhookSecret,
      });
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await processor.process(mockJob as any);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const headers = fetchCall[1].headers as HeadersInit;
      const timestamp = getHeader(headers, 'X-Digest-Timestamp');
      const signature = getHeader(headers, 'X-Digest-Signature');
      const bodyString = fetchCall[1].body as string;

      expect(typeof bodyString).toBe('string');
      expect(timestamp).toBeTruthy();
      expect(signature).toBeTruthy();

      const expected = createHmac('sha256', webhookSecret)
        .update(`${timestamp}.${bodyString}`)
        .digest('hex');

      expect(signature).toBe(`sha256=${expected}`);
    });

    it('should return "none" signature when no webhookSecret', async () => {
      mockUrlValidator.isAllowed.mockResolvedValue(true);
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        webhookSecret: null,
      });
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await processor.process(mockJob as any);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(getHeader(headers, 'X-Digest-Signature')).toBe('none');
    });

    it('should include event header', async () => {
      mockUrlValidator.isAllowed.mockResolvedValue(true);
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({});
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await processor.process(mockJob as any);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(getHeader(headers, 'X-Digest-Event')).toBe('digest.run.completed');
    });

    it('should record failure and throw on HTTP error', async () => {
      mockUrlValidator.isAllowed.mockResolvedValue(true);
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({});
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(processor.process(mockJob as any)).rejects.toThrow(
        'HTTP 500',
      );

      expect(mockPrisma.digestRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({
          webhookDeliveredAt: undefined,
          webhookError: 'HTTP 500',
          webhookStatusCode: 500,
        }),
      });
    });

    it('should handle 4xx client errors', async () => {
      mockUrlValidator.isAllowed.mockResolvedValue(true);
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({});
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(processor.process(mockJob as any)).rejects.toThrow(
        'HTTP 404',
      );
    });

    it('should handle network errors', async () => {
      mockUrlValidator.isAllowed.mockResolvedValue(true);
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({});
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(processor.process(mockJob as any)).rejects.toThrow(
        'Network error',
      );

      expect(mockPrisma.digestRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({
          webhookError: 'Network error',
        }),
      });
    });

    it('should not double-record HTTP errors', async () => {
      mockUrlValidator.isAllowed.mockResolvedValue(true);
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({});
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 503,
      });

      await expect(processor.process(mockJob as any)).rejects.toThrow(
        'HTTP 503',
      );

      // Should only call update once (not in catch block for HTTP errors)
      expect(mockPrisma.digestRun.update).toHaveBeenCalledTimes(1);
    });

    it('should post JSON body with correct content-type', async () => {
      mockUrlValidator.isAllowed.mockResolvedValue(true);
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({});
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await processor.process(mockJob as any);

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].method).toBe('POST');
      expect(getHeader(fetchCall[1].headers, 'Content-Type')).toBe(
        'application/json',
      );
      expect(JSON.parse(fetchCall[1].body)).toEqual(mockJob.data.payload);
    });

    it('should handle timeout errors', async () => {
      mockUrlValidator.isAllowed.mockResolvedValue(true);
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({});
      (global.fetch as any).mockRejectedValue(new Error('Request timeout'));

      await expect(processor.process(mockJob as any)).rejects.toThrow(
        'Request timeout',
      );
    });

    it('should include timestamp header', async () => {
      mockUrlValidator.isAllowed.mockResolvedValue(true);
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({});
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await processor.process(mockJob as any);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const headers = fetchCall[1].headers;
      const timestamp = getHeader(headers, 'X-Digest-Timestamp');
      expect(timestamp).toBeDefined();
      // Verify it's a valid ISO timestamp
      expect(() => new Date(timestamp ?? '')).not.toThrow();
    });

    it('should not fail recording when DB update fails', async () => {
      mockUrlValidator.isAllowed.mockResolvedValue(true);
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({});
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });
      mockPrisma.digestRun.update.mockRejectedValue(new Error('DB error'));

      // Should still return success
      const result = await processor.process(mockJob as any);
      expect(result.success).toBe(true);
    });
  });
});
