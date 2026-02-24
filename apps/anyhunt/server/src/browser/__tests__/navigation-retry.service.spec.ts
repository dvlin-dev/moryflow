import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BrowserNavigationError,
  NavigationRetryService,
} from '../runtime/navigation-retry.service';

const budget = {
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 400,
};

describe('NavigationRetryService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries network failures with exponential backoff and succeeds', async () => {
    vi.useFakeTimers();
    const service = new NavigationRetryService();
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error('Navigation timeout exceeded'))
      .mockRejectedValueOnce(new Error('net::ERR_CONNECTION_RESET'))
      .mockResolvedValueOnce({ ok: true });

    const task = service.run({
      host: 'example.com',
      budget,
      execute,
    });

    await vi.runAllTimersAsync();
    const result = await task;

    expect(result).toEqual({ ok: true });
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it('does not retry access control errors', async () => {
    const service = new NavigationRetryService();
    const execute = vi.fn().mockRejectedValue(new Error('HTTP 403 forbidden'));

    await expect(
      service.run({
        host: 'example.com',
        budget,
        execute,
      }),
    ).rejects.toMatchObject({
      failureClass: 'access_control',
      reason: 'http_403',
      retryable: false,
    });

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('classifies response status and challenge pages', () => {
    const service = new NavigationRetryService();

    expect(
      service.classifyResult({
        host: 'example.com',
        responseStatus: 429,
        finalUrl: 'https://example.com',
        title: 'Home',
      }),
    ).toMatchObject({
      failureClass: 'access_control',
      reason: 'http_429',
      statusCode: 429,
    });

    expect(
      service.classifyResult({
        host: 'example.com',
        responseStatus: 200,
        finalUrl: 'https://example.com/captcha/challenge',
        title: 'Please verify you are human',
      }),
    ).toMatchObject({
      failureClass: 'access_control',
      reason: 'challenge',
      statusCode: 403,
    });
  });
});
