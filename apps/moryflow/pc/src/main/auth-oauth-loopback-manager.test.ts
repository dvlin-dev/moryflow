import { describe, expect, it, vi } from 'vitest';
import { createOAuthLoopbackManager } from './auth-oauth-loopback-manager';
import type { OAuthLoopbackHandle, OAuthLoopbackPayload } from './auth-oauth-loopback';

const createOwnerMock = (id: number) => {
  let destroyed = false;
  let destroyedListener: (() => void) | null = null;

  return {
    id,
    send: vi.fn(),
    isDestroyed: () => destroyed,
    onDestroyed: (listener: () => void) => {
      destroyedListener = listener;
      return () => {
        if (destroyedListener === listener) {
          destroyedListener = null;
        }
      };
    },
    destroy: () => {
      destroyed = true;
      destroyedListener?.();
    },
  };
};

describe('createOAuthLoopbackManager', () => {
  it('should keep loopback listeners isolated per owner', async () => {
    const handles = new Map<number, OAuthLoopbackHandle>();
    const startListener = vi.fn(async ({ onCallback }) => {
      const id = handles.size + 1;
      const handle: OAuthLoopbackHandle = {
        callbackUrl: `http://127.0.0.1:${38970 + id}/auth/success`,
        stop: vi.fn(async () => undefined),
      };
      handles.set(id, handle);
      return {
        ...handle,
        stop: handle.stop,
      };
    });
    const manager = createOAuthLoopbackManager(startListener);
    const ownerA = createOwnerMock(1);
    const ownerB = createOwnerMock(2);

    const resultA = await manager.start(ownerA);
    const resultB = await manager.start(ownerB);

    expect(resultA.callbackUrl).not.toBe(resultB.callbackUrl);
    expect(startListener).toHaveBeenCalledTimes(2);
    const firstHandle = handles.get(1);
    expect(firstHandle?.stop).not.toHaveBeenCalled();
  });

  it('should stop the owner listener when the owner is destroyed', async () => {
    const stopMock = vi.fn(async () => undefined);
    const startListener = vi.fn(async () => {
      return {
        callbackUrl: 'http://127.0.0.1:38971/auth/success',
        stop: stopMock,
      };
    });
    const manager = createOAuthLoopbackManager(startListener);
    const owner = createOwnerMock(1);

    await manager.start(owner);
    owner.destroy();

    expect(stopMock).toHaveBeenCalledTimes(1);
  });

  it('should fail callback delivery when owner is unavailable', async () => {
    let onCallback: ((payload: OAuthLoopbackPayload) => Promise<void>) | null = null;
    const startListener = vi.fn(async (input) => {
      onCallback = input.onCallback;
      return {
        callbackUrl: 'http://127.0.0.1:38971/auth/success',
        stop: vi.fn(async () => undefined),
      };
    });
    const manager = createOAuthLoopbackManager(startListener);
    const owner = createOwnerMock(1);

    await manager.start(owner);
    owner.destroy();

    await expect(
      onCallback?.({ code: 'code_1', nonce: 'nonce_1' }) ?? Promise.resolve()
    ).rejects.toThrow('OAuth callback target is unavailable');
    expect(owner.send).not.toHaveBeenCalled();
  });
});
