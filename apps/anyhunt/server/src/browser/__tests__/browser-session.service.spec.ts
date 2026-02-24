import { describe, expect, it, vi } from 'vitest';
import { BrowserSessionService } from '../browser-session.service';
import {
  BrowserPolicyDeniedError,
  BrowserNavigationRateLimitError,
  DEFAULT_SITE_POLICY,
} from '../policy';
import { BrowserNavigationError } from '../runtime';

const createService = () => {
  const page = {
    goto: vi.fn().mockResolvedValue(undefined),
    title: vi.fn().mockResolvedValue('Example'),
    url: vi.fn().mockReturnValue('https://example.com'),
  };

  const session = {
    id: 'bs_test',
    refs: new Map<string, unknown>(),
  };

  const sessionManager = {
    assertSessionOwnership: vi.fn().mockReturnValue(session),
    getActiveContext: vi.fn().mockReturnValue({}),
    getActivePage: vi.fn().mockReturnValue(page),
  };

  const snapshotService = {
    clearCache: vi.fn(),
  };

  const networkInterceptor = {
    setScopedHeaders: vi.fn().mockResolvedValue(undefined),
  };

  const urlValidator = {
    isAllowed: vi.fn().mockResolvedValue(true),
  };

  const sitePolicyService = {
    assertNavigationAllowed: vi.fn(),
    resolve: vi.fn().mockReturnValue(DEFAULT_SITE_POLICY),
  };
  const releaseNavigationQuota = vi.fn();
  const siteRateLimiter = {
    acquireNavigationQuota: vi.fn().mockReturnValue(releaseNavigationQuota),
  };
  const navigationRetry = {
    run: vi.fn().mockImplementation(async ({ execute }) => execute(1)),
    classifyResult: vi.fn().mockReturnValue(null),
  };
  const riskTelemetry = {
    recordPolicyBlock: vi.fn(),
    recordRateLimitBlock: vi.fn(),
    recordNavigationResult: vi.fn(),
    cleanupSession: vi.fn(),
    getSessionSummary: vi.fn().mockReturnValue({
      windowMs: 86400000,
      navigation: { total: 0, success: 0, failed: 0, successRate: 0 },
      topReasons: [],
      topHosts: [],
      actionPacing: { delayedActions: 0, avgDelayMs: 0 },
      recommendations: ['No navigation data in the selected time window.'],
    }),
  };
  const streamService = {
    cleanupSession: vi.fn(),
  };

  const service = new BrowserSessionService(
    sessionManager as never,
    snapshotService as never,
    {} as never,
    urlValidator as never,
    {} as never,
    networkInterceptor as never,
    {} as never,
    {} as never,
    {} as never,
    riskTelemetry as never,
    streamService as never,
    sitePolicyService as never,
    siteRateLimiter as never,
    navigationRetry as never,
  );

  return {
    service,
    deps: {
      page,
      session,
      sessionManager,
      snapshotService,
      networkInterceptor,
      urlValidator,
      sitePolicyService,
      siteRateLimiter,
      releaseNavigationQuota,
      navigationRetry,
      riskTelemetry,
    },
  };
};

describe('BrowserSessionService.openUrl', () => {
  it('checks site policy with normalized host before navigation', async () => {
    const { service, deps } = createService();

    const result = await service.openUrl('user_1', 'bs_test', {
      url: 'https://Example.COM/path',
      waitUntil: 'domcontentloaded',
      timeout: 2000,
    });

    expect(deps.sitePolicyService.assertNavigationAllowed).toHaveBeenCalledWith(
      {
        sessionId: 'bs_test',
        host: 'example.com',
        url: 'https://Example.COM/path',
      },
    );
    expect(deps.sessionManager.assertSessionOwnership).toHaveBeenCalledWith(
      'bs_test',
      'user_1',
    );
    expect(deps.siteRateLimiter.acquireNavigationQuota).toHaveBeenCalledWith({
      host: 'example.com',
      policyId: DEFAULT_SITE_POLICY.id,
      maxRps: DEFAULT_SITE_POLICY.maxRps,
      maxBurst: DEFAULT_SITE_POLICY.maxBurst,
      maxConcurrentNavigationsPerHost:
        DEFAULT_SITE_POLICY.maxConcurrentNavigationsPerHost,
    });
    expect(deps.page.goto).toHaveBeenCalledTimes(1);
    expect(deps.navigationRetry.run).toHaveBeenCalledTimes(1);
    expect(deps.navigationRetry.run).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'example.com',
        budget: DEFAULT_SITE_POLICY.retryBudget,
        execute: expect.any(Function),
      }),
    );
    expect(deps.navigationRetry.classifyResult).toHaveBeenCalledTimes(1);
    expect(deps.releaseNavigationQuota).toHaveBeenCalledTimes(1);
    expect(deps.riskTelemetry.recordNavigationResult).toHaveBeenCalledWith({
      host: 'example.com',
      reason: 'success',
      policyId: DEFAULT_SITE_POLICY.id,
      sessionId: 'bs_test',
      class: 'none',
      success: true,
    });
    expect(result.success).toBe(true);
  });

  it('throws policy denied error and skips navigation', async () => {
    const { service, deps } = createService();
    deps.sitePolicyService.assertNavigationAllowed.mockImplementation(() => {
      throw new BrowserPolicyDeniedError(
        'blocked.example',
        'deny_policy',
        'automation_disabled',
      );
    });

    await expect(
      service.openUrl('user_1', 'bs_test', {
        url: 'https://blocked.example/path',
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      }),
    ).rejects.toBeInstanceOf(BrowserPolicyDeniedError);

    expect(deps.page.goto).not.toHaveBeenCalled();
    expect(deps.siteRateLimiter.acquireNavigationQuota).not.toHaveBeenCalled();
    expect(deps.riskTelemetry.recordPolicyBlock).toHaveBeenCalledTimes(1);
    expect(deps.sessionManager.assertSessionOwnership).toHaveBeenCalledWith(
      'bs_test',
      'user_1',
    );
  });

  it('throws rate limit error and skips navigation', async () => {
    const { service, deps } = createService();
    deps.siteRateLimiter.acquireNavigationQuota.mockImplementation(() => {
      throw new BrowserNavigationRateLimitError(
        'example.com',
        DEFAULT_SITE_POLICY.id,
        'rate_limit',
      );
    });

    await expect(
      service.openUrl('user_1', 'bs_test', {
        url: 'https://example.com/path',
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      }),
    ).rejects.toBeInstanceOf(BrowserNavigationRateLimitError);

    expect(deps.page.goto).not.toHaveBeenCalled();
    expect(deps.riskTelemetry.recordRateLimitBlock).toHaveBeenCalledTimes(1);
    expect(deps.sessionManager.assertSessionOwnership).toHaveBeenCalledWith(
      'bs_test',
      'user_1',
    );
  });

  it('does not consume host quota when session access check fails', async () => {
    const { service, deps } = createService();
    deps.sessionManager.assertSessionOwnership.mockImplementation(() => {
      throw new Error('Session not found');
    });

    await expect(
      service.openUrl('user_1', 'bs_missing', {
        url: 'https://example.com/path',
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      }),
    ).rejects.toThrow('Session not found');

    expect(
      deps.sitePolicyService.assertNavigationAllowed,
    ).not.toHaveBeenCalled();
    expect(deps.siteRateLimiter.acquireNavigationQuota).not.toHaveBeenCalled();
  });

  it('records navigation failure telemetry when retry flow fails', async () => {
    const { service, deps } = createService();
    deps.navigationRetry.run.mockRejectedValueOnce(
      new BrowserNavigationError(
        'example.com',
        'network',
        'timeout',
        true,
        503,
      ),
    );

    await expect(
      service.openUrl('user_1', 'bs_test', {
        url: 'https://example.com/path',
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      }),
    ).rejects.toBeInstanceOf(BrowserNavigationError);

    expect(deps.riskTelemetry.recordNavigationResult).toHaveBeenCalledWith({
      host: 'example.com',
      reason: 'timeout',
      policyId: DEFAULT_SITE_POLICY.id,
      sessionId: 'bs_test',
      class: 'network',
      success: false,
    });
  });

  it('returns detection risk summary for owned session', () => {
    const { service, deps } = createService();
    const summary = service.getDetectionRisk('user_1', 'bs_test');
    expect(deps.sessionManager.assertSessionOwnership).toHaveBeenCalledWith(
      'bs_test',
      'user_1',
    );
    expect(deps.riskTelemetry.getSessionSummary).toHaveBeenCalledWith(
      'bs_test',
    );
    expect(summary.navigation.successRate).toBe(0);
  });
});
