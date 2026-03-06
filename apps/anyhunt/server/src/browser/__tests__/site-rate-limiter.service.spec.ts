import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  BrowserNavigationRateLimitError,
  SiteRateLimiterService,
} from '../policy';

const input = {
  host: 'example.com',
  policyId: 'default',
  maxRps: 1,
  maxBurst: 1,
  maxConcurrentNavigationsPerHost: 1,
};

const expectRateLimitError = (
  run: () => void,
  reason: 'rate_limit' | 'concurrency_limit',
) => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(BrowserNavigationRateLimitError);
    expect((error as BrowserNavigationRateLimitError).reason).toBe(reason);
    return;
  }
  throw new Error('Expected BrowserNavigationRateLimitError');
};

describe('SiteRateLimiterService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('enforces concurrent navigation limit and releases token in finally flow', () => {
    const limiter = new SiteRateLimiterService();
    const concurrentInput = {
      ...input,
      maxRps: 10,
      maxBurst: 2,
    };
    const release = limiter.acquireNavigationQuota(concurrentInput);

    expectRateLimitError(
      () => limiter.acquireNavigationQuota(concurrentInput),
      'concurrency_limit',
    );

    release();
    release();
    expect(() => limiter.acquireNavigationQuota(concurrentInput)).not.toThrow();
  });

  it('enforces rps budget and refills token by time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-24T00:00:00.000Z'));

    const limiter = new SiteRateLimiterService();
    const release = limiter.acquireNavigationQuota(input);
    release();

    expectRateLimitError(
      () => limiter.acquireNavigationQuota(input),
      'rate_limit',
    );

    vi.advanceTimersByTime(1000);
    expect(() => limiter.acquireNavigationQuota(input)).not.toThrow();
  });

  it('evicts stale host states during periodic cleanup', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-24T00:00:00.000Z'));

    const limiter = new SiteRateLimiterService();
    const release = limiter.acquireNavigationQuota({
      ...input,
      host: 'old.example.com',
    });
    release();

    vi.advanceTimersByTime(16 * 60 * 1000);
    expect(() =>
      limiter.acquireNavigationQuota({
        ...input,
        host: 'new.example.com',
      }),
    ).not.toThrow();

    const states = (limiter as unknown as { states: Map<string, unknown> })
      .states;
    expect(states.has('old.example.com')).toBe(false);
    expect(states.has('new.example.com')).toBe(true);
  });
});
