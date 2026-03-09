import { afterEach, describe, expect, it, vi } from 'vitest';
import { startOAuthLoopbackListener } from './auth-oauth-loopback';

describe('startOAuthLoopbackListener', () => {
  const stopHandles: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await Promise.all(stopHandles.splice(0).map((stop) => stop()));
  });

  it('should receive oauth callback payload from localhost listener', async () => {
    const onCallback = vi.fn();
    const handle = await startOAuthLoopbackListener({ onCallback });
    stopHandles.push(handle.stop);

    const response = await fetch(`${handle.callbackUrl}?code=code_1&nonce=nonce_1`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('return to Moryflow');
    expect(onCallback).toHaveBeenCalledWith({
      code: 'code_1',
      nonce: 'nonce_1',
    });
  });

  it('should reject missing oauth callback params', async () => {
    const handle = await startOAuthLoopbackListener({
      onCallback: vi.fn(),
    });
    stopHandles.push(handle.stop);

    const response = await fetch(`${handle.callbackUrl}?code=code_only`);

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('Missing oauth callback params');
  });
});
