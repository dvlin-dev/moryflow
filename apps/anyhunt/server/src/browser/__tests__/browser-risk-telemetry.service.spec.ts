import { describe, expect, it, vi, afterEach } from 'vitest';
import { BrowserRiskTelemetryService } from '../observability';

describe('BrowserRiskTelemetryService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('aggregates risk events by host and reason', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-24T10:00:00.000Z'));

    const service = new BrowserRiskTelemetryService();
    service.recordNavigationResult({
      host: 'example.com',
      reason: 'http_429',
      policyId: 'default',
      sessionId: 'bs_1',
      class: 'access_control',
      success: false,
    });
    service.recordNavigationResult({
      host: 'example.com',
      reason: 'http_429',
      policyId: 'default',
      sessionId: 'bs_1',
      class: 'access_control',
      success: false,
    });
    service.recordNavigationResult({
      host: 'example.com',
      reason: 'success',
      policyId: 'default',
      sessionId: 'bs_1',
      class: 'none',
      success: true,
    });
    service.recordActionPacing({
      sessionId: 'bs_1',
      host: 'example.com',
      actionType: 'click',
      delayMs: 120,
    });
    service.recordActionPacing({
      sessionId: 'bs_1',
      host: 'example.com',
      actionType: 'type',
      delayMs: 180,
    });

    const summary = service.getSessionSummary('bs_1');

    expect(summary.navigation).toEqual({
      total: 3,
      success: 1,
      failed: 2,
      successRate: 0.3333,
    });
    expect(summary.topReasons[0]).toEqual({
      reason: 'http_429',
      count: 2,
    });
    expect(summary.topHosts[0]).toEqual({
      host: 'example.com',
      count: 2,
    });
    expect(summary.actionPacing).toEqual({
      delayedActions: 2,
      avgDelayMs: 150,
    });
    expect(summary.recommendations[0]).toContain('concurrency');
  });

  it('supports cleanup by session id', () => {
    const service = new BrowserRiskTelemetryService();
    service.recordNavigationResult({
      host: 'example.com',
      reason: 'success',
      policyId: 'default',
      sessionId: 'bs_2',
      class: 'none',
      success: true,
    });

    service.cleanupSession('bs_2');
    const summary = service.getSessionSummary('bs_2');

    expect(summary.navigation.total).toBe(0);
    expect(summary.navigation.successRate).toBe(0);
    expect(summary.topReasons).toEqual([]);
    expect(summary.recommendations).toEqual([
      'No navigation data in the selected time window.',
    ]);
  });

  it('suggests lowering concurrency on concurrency limit reason', () => {
    const service = new BrowserRiskTelemetryService();
    service.recordNavigationResult({
      host: 'example.com',
      reason: 'concurrency_limit',
      policyId: 'default',
      sessionId: 'bs_3',
      class: 'access_control',
      success: false,
    });

    const summary = service.getSessionSummary('bs_3');
    expect(
      summary.recommendations.some((item) => item.includes('concurrency')),
    ).toBe(true);
  });
});
