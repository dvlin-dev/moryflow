import { describe, expect, it } from 'vitest';
import { buildCdpConnectPayload } from './use-browser-session-data-actions';

describe('buildCdpConnectPayload', () => {
  it('trims wsEndpoint and keeps port/timeout', () => {
    const payload = buildCdpConnectPayload({
      wsEndpoint: '  ws://localhost:9222/devtools/browser/abc  ',
      port: 9222,
      timeout: 30000,
    });

    expect(payload).toEqual({
      wsEndpoint: 'ws://localhost:9222/devtools/browser/abc',
      port: 9222,
      timeout: 30000,
    });
  });

  it('drops empty wsEndpoint and never carries legacy provider', () => {
    const payload = buildCdpConnectPayload({
      wsEndpoint: '   ',
      timeout: 30000,
      // Legacy field from removed protocol, should not leak into request payload.
      provider: 'browserbase',
    } as unknown as Parameters<typeof buildCdpConnectPayload>[0]);

    expect(payload).toEqual({
      wsEndpoint: undefined,
      port: undefined,
      timeout: 30000,
    });
    expect(Object.prototype.hasOwnProperty.call(payload, 'provider')).toBe(false);
  });
});
