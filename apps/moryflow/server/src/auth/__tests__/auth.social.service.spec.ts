import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSocialService } from '../auth-social.service';
import type { RedisService } from '../../redis/redis.service';

describe('AuthSocialService', () => {
  const setMock = vi.fn();
  const evalMock = vi.fn();
  let service: AuthSocialService;
  let previousDeepLinkScheme: string | undefined;

  beforeEach(() => {
    previousDeepLinkScheme = process.env.MORYFLOW_DEEP_LINK_SCHEME;
    setMock.mockReset();
    evalMock.mockReset();
    delete process.env.AUTH_SOCIAL_EXCHANGE_TTL_SECONDS;
    delete process.env.MORYFLOW_DEEP_LINK_SCHEME;
    service = new AuthSocialService({
      set: setMock,
      client: {
        eval: evalMock,
      },
    } as unknown as RedisService);
  });

  afterEach(() => {
    if (previousDeepLinkScheme) {
      process.env.MORYFLOW_DEEP_LINK_SCHEME = previousDeepLinkScheme;
      return;
    }
    delete process.env.MORYFLOW_DEEP_LINK_SCHEME;
  });

  it('should issue exchange code and persist ticket with TTL', async () => {
    const code = await service.issueGoogleExchangeCode({
      userId: 'user_1',
      nonce: 'nonce_1',
    });

    expect(code).toBeTruthy();
    expect(setMock).toHaveBeenCalledTimes(1);
    const [key, value, ttl] = setMock.mock.calls[0] as [string, string, number];
    expect(key).toContain(code);
    expect(ttl).toBe(120);

    const payload = JSON.parse(value) as {
      userId: string;
      nonce: string;
      provider: string;
    };
    expect(payload).toMatchObject({
      userId: 'user_1',
      nonce: 'nonce_1',
      provider: 'google',
    });
  });

  it('should consume exchange code atomically', async () => {
    evalMock.mockResolvedValueOnce(
      JSON.stringify({
        userId: 'user_2',
        nonce: 'nonce_2',
        provider: 'google',
        issuedAt: new Date().toISOString(),
      }),
    );

    const result = await service.consumeGoogleExchangeCode('code_2');

    expect(evalMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      userId: 'user_2',
      nonce: 'nonce_2',
      provider: 'google',
    });
  });

  it('should return null when exchange code is absent', async () => {
    evalMock.mockResolvedValueOnce(null);
    await expect(
      service.consumeGoogleExchangeCode('missing'),
    ).resolves.toBeNull();
  });

  it('should normalize deep link scheme to lowercase', () => {
    process.env.MORYFLOW_DEEP_LINK_SCHEME = 'MoryFlow';
    const deepLink = service.buildGoogleBridgeDeepLink({
      code: 'code_3',
      nonce: 'nonce_3',
    });

    expect(deepLink.startsWith('moryflow://auth/success')).toBe(true);
  });
});
