/**
 * CdpConnectorService 单元测试
 *
 * 覆盖 CDP 白名单与 SSRF 策略校验
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import type { UrlValidator } from '../../common/validators/url.validator';

const connectOverCDP = vi.fn();

vi.mock('playwright', () => ({
  chromium: {
    connectOverCDP,
  },
}));

const originalEnv = { ...process.env };

const createUrlValidator = (allowed: boolean) =>
  ({
    isAllowed: vi.fn().mockResolvedValue(allowed),
  }) as unknown as UrlValidator;

const loadService = async () => {
  const mod = await import('../cdp/cdp-connector.service');
  return mod;
};

afterEach(() => {
  process.env = { ...originalEnv };
  connectOverCDP.mockReset();
  vi.resetModules();
});

describe('CdpConnectorService', () => {
  it('blocks when allowlist is empty', async () => {
    process.env.BROWSER_CDP_ALLOWED_HOSTS = '';
    process.env.BROWSER_CDP_ALLOW_PRIVATE_HOSTS = 'false';
    const { CdpConnectorService, CdpPolicyError } = await loadService();
    const service = new CdpConnectorService(createUrlValidator(true));

    await expect(
      service.connect({ wsEndpoint: 'ws://example.com:9222' }),
    ).rejects.toBeInstanceOf(CdpPolicyError);
    expect(connectOverCDP).not.toHaveBeenCalled();
  });

  it('blocks non-allowlisted host', async () => {
    process.env.BROWSER_CDP_ALLOWED_HOSTS = 'allowed.example';
    process.env.BROWSER_CDP_ALLOW_PRIVATE_HOSTS = 'false';
    const { CdpConnectorService, CdpPolicyError } = await loadService();
    const service = new CdpConnectorService(createUrlValidator(true));

    await expect(
      service.connect({ wsEndpoint: 'ws://blocked.example:9222' }),
    ).rejects.toBeInstanceOf(CdpPolicyError);
    expect(connectOverCDP).not.toHaveBeenCalled();
  });

  it('blocks when SSRF policy rejects endpoint', async () => {
    process.env.BROWSER_CDP_ALLOWED_HOSTS = 'example.com';
    process.env.BROWSER_CDP_ALLOW_PRIVATE_HOSTS = 'false';
    const { CdpConnectorService, CdpPolicyError } = await loadService();
    const service = new CdpConnectorService(createUrlValidator(false));

    await expect(
      service.connect({ wsEndpoint: 'ws://example.com:9222' }),
    ).rejects.toBeInstanceOf(CdpPolicyError);
    expect(connectOverCDP).not.toHaveBeenCalled();
  });

  it('allows connection when host is allowed and SSRF passes', async () => {
    process.env.BROWSER_CDP_ALLOWED_HOSTS = 'example.com';
    process.env.BROWSER_CDP_ALLOW_PRIVATE_HOSTS = 'false';
    const { CdpConnectorService } = await loadService();
    const service = new CdpConnectorService(createUrlValidator(true));

    connectOverCDP.mockResolvedValue({
      on: vi.fn(),
    });

    await service.connect({ wsEndpoint: 'ws://example.com:9222' });
    expect(connectOverCDP).toHaveBeenCalledTimes(1);
  });

  it('requires Browserbase env when provider is browserbase', async () => {
    process.env.BROWSERBASE_API_KEY = '';
    process.env.BROWSERBASE_PROJECT_ID = '';
    const { CdpConnectorService, CdpConnectionError } = await loadService();
    const service = new CdpConnectorService(createUrlValidator(true));

    await expect(
      service.connect({ provider: 'browserbase' }),
    ).rejects.toBeInstanceOf(CdpConnectionError);
  });

  it('requires Browser Use env when provider is browseruse', async () => {
    process.env.BROWSER_USE_API_KEY = '';
    const { CdpConnectorService, CdpConnectionError } = await loadService();
    const service = new CdpConnectorService(createUrlValidator(true));

    await expect(
      service.connect({ provider: 'browseruse' }),
    ).rejects.toBeInstanceOf(CdpConnectionError);
  });
});
