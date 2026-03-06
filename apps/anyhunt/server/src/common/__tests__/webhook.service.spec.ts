import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createHmac } from 'crypto';
import { WebhookService } from '../services/webhook.service';
import type { ConfigService } from '@nestjs/config';
import type { UrlValidator } from '../validators/url.validator';

describe('Common WebhookService', () => {
  let service: WebhookService;
  let mockConfig: { get: Mock };
  let mockUrlValidator: { isAllowed: Mock };

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      get: vi.fn().mockReturnValue('webhook-secret'),
    };

    mockUrlValidator = {
      isAllowed: vi.fn().mockResolvedValue(true),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    service = new WebhookService(
      mockConfig as unknown as ConfigService,
      mockUrlValidator as unknown as UrlValidator,
    );
  });

  it('sends signature for the exact JSON string used as HTTP body', async () => {
    const payload = {
      event: 'digest.run.completed',
      data: { runId: 'run-1' },
    };

    const result = await service.send('https://example.com/webhook', payload);

    expect(result).toBe(true);

    const fetchCall = (global.fetch as unknown as Mock).mock.calls[0];
    const requestInit = fetchCall[1];
    const bodyString = requestInit.body as string;
    const headers = new Headers(requestInit.headers as HeadersInit);
    const expectedSignature = createHmac('sha256', 'webhook-secret')
      .update(bodyString)
      .digest('hex');

    expect(typeof bodyString).toBe('string');
    expect(headers.get('X-Webhook-Signature')).toBe(expectedSignature);
    expect(headers.get('X-Webhook-Event')).toBe('digest.run.completed');
    expect(JSON.parse(bodyString)).toMatchObject({
      event: payload.event,
      data: payload.data,
    });
  });

  it('returns false when URL is blocked by SSRF guard', async () => {
    mockUrlValidator.isAllowed.mockResolvedValue(false);

    const result = await service.send('http://localhost:3000/hook', {
      event: 'digest.run.completed',
      data: { runId: 'run-1' },
    });

    expect(result).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
