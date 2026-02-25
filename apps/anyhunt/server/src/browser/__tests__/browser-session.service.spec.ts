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
    getScopedHeaders: vi.fn().mockReturnValue([]),
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

  const stealthRegion = {
    resolveRegion: vi.fn().mockReturnValue(null),
  };
  const riskDetectionService = {
    detect: vi.fn().mockReturnValue([]),
  };
  const humanBehavior = {
    computeNavigationDelay: vi.fn().mockReturnValue(0),
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
    stealthRegion as never,
    riskDetectionService as never,
    humanBehavior as never,
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
      stealthRegion,
      riskDetectionService,
      humanBehavior,
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

    expect(
      deps.sitePolicyService.assertNavigationAllowed,
    ).toHaveBeenNthCalledWith(1, {
      sessionId: 'bs_test',
      host: 'example.com',
      url: 'https://Example.COM/path',
    });
    expect(
      deps.sitePolicyService.assertNavigationAllowed,
    ).toHaveBeenNthCalledWith(2, {
      sessionId: 'bs_test',
      host: 'example.com',
      url: 'https://example.com',
    });
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
    expect(deps.humanBehavior.computeNavigationDelay).toHaveBeenCalledTimes(1);
  });

  it('rechecks redirected host policy and blocks denied redirect target', async () => {
    const { service, deps } = createService();
    deps.page.url
      .mockReturnValueOnce('https://blocked.example/landing')
      .mockReturnValue('https://blocked.example/landing');
    deps.sitePolicyService.resolve.mockImplementation((targetHost: string) => {
      if (targetHost === 'blocked.example') {
        return {
          ...DEFAULT_SITE_POLICY,
          id: 'blocked_policy',
        };
      }
      return DEFAULT_SITE_POLICY;
    });
    deps.sitePolicyService.assertNavigationAllowed.mockImplementation(
      ({ host: targetHost }: { host: string }) => {
        if (targetHost === 'blocked.example') {
          throw new BrowserPolicyDeniedError(
            'blocked.example',
            'blocked_policy',
            'automation_disabled',
          );
        }
      },
    );

    await expect(
      service.openUrl('user_1', 'bs_test', {
        url: 'https://example.com/path',
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      }),
    ).rejects.toBeInstanceOf(BrowserPolicyDeniedError);

    expect(deps.page.goto).toHaveBeenCalledTimes(1);
    expect(
      deps.sitePolicyService.assertNavigationAllowed,
    ).toHaveBeenNthCalledWith(1, {
      sessionId: 'bs_test',
      host: 'example.com',
      url: 'https://example.com/path',
    });
    expect(
      deps.sitePolicyService.assertNavigationAllowed,
    ).toHaveBeenNthCalledWith(2, {
      sessionId: 'bs_test',
      host: 'blocked.example',
      url: 'https://blocked.example/landing',
    });
    expect(deps.riskTelemetry.recordPolicyBlock).toHaveBeenCalledWith({
      host: 'blocked.example',
      reason: 'automation_disabled',
      policyId: 'blocked_policy',
      sessionId: 'bs_test',
      class: 'access_control',
    });
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

  it('merges Accept-Language into scoped headers without overriding existing scoped headers', async () => {
    const { service, deps } = createService();
    deps.stealthRegion.resolveRegion.mockReturnValueOnce({
      locale: 'ja-JP',
      timezone: 'Asia/Tokyo',
      acceptLanguage: 'ja-JP,ja;q=0.9,en;q=0.8',
    });
    deps.networkInterceptor.getScopedHeaders.mockReturnValueOnce([
      {
        origin: 'example.com',
        headers: { Authorization: 'Bearer existing' },
      },
    ]);

    await service.openUrl('user_1', 'bs_test', {
      url: 'https://example.com/path',
      waitUntil: 'domcontentloaded',
      timeout: 2000,
      headers: { 'X-Trace-Id': 'trace-1' },
    });

    expect(deps.networkInterceptor.setScopedHeaders).toHaveBeenCalledWith(
      'bs_test',
      expect.any(Object),
      'https://example.com/path',
      {
        Authorization: 'Bearer existing',
        'X-Trace-Id': 'trace-1',
        'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
      },
    );
  });

  it('retries navigation when risk signals are detected and records recovery telemetry', async () => {
    const { service, deps } = createService();
    deps.riskDetectionService.detect
      .mockReturnValueOnce([
        {
          code: 'captcha_interstitial',
          source: 'title',
          evidence: 'captcha',
          confidence: 0.98,
        },
      ])
      .mockReturnValueOnce([]);

    vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

    await service.openUrl('user_1', 'bs_test', {
      url: 'https://example.com/path',
      waitUntil: 'domcontentloaded',
      timeout: 2000,
    });

    expect(deps.page.goto).toHaveBeenCalledTimes(2);
    expect(deps.riskTelemetry.recordNavigationResult).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'risk_signal:captcha_interstitial',
        class: 'access_control',
        success: true,
      }),
    );
    expect(deps.riskTelemetry.recordNavigationResult).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'risk_recovered:captcha_interstitial',
        class: 'none',
        success: true,
      }),
    );
  });

  it('consumes host quota per retry attempt', async () => {
    const { service, deps } = createService();
    deps.navigationRetry.run.mockImplementation(
      async ({
        execute,
      }: {
        execute: (attempt: number) => Promise<unknown>;
      }) => {
        await execute(1);
        return execute(2);
      },
    );

    await service.openUrl('user_1', 'bs_test', {
      url: 'https://example.com/path',
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    expect(deps.siteRateLimiter.acquireNavigationQuota).toHaveBeenCalledTimes(
      2,
    );
    expect(deps.releaseNavigationQuota).toHaveBeenCalledTimes(2);
    expect(deps.page.goto).toHaveBeenCalledTimes(2);
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
