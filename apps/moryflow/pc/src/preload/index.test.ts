import { beforeEach, describe, expect, it, vi } from 'vitest';

const electronMocks = vi.hoisted(() => {
  return {
    exposeInMainWorld: vi.fn(),
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  };
});

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: electronMocks.exposeInMainWorld,
  },
  ipcRenderer: {
    invoke: electronMocks.invoke,
    on: electronMocks.on,
    removeListener: electronMocks.removeListener,
  },
}));

const loadDesktopApi = async () => {
  await import('./index');
  const latestExpose = electronMocks.exposeInMainWorld.mock.calls.at(-1);
  if (!latestExpose) {
    throw new Error('desktopAPI is not exposed');
  }
  return latestExpose[1] as {
    membership: { openExternal: (url: string) => Promise<void> };
    payment: { openCheckout: (url: string) => Promise<void> };
  };
};

describe('preload openExternal bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    electronMocks.exposeInMainWorld.mockReset();
    electronMocks.invoke.mockReset();
    electronMocks.on.mockReset();
    electronMocks.removeListener.mockReset();
  });

  it('should resolve membership openExternal when main process opens url', async () => {
    electronMocks.invoke.mockResolvedValueOnce(true);
    const api = await loadDesktopApi();

    await expect(api.membership.openExternal('https://example.com')).resolves.toBeUndefined();
    expect(electronMocks.invoke).toHaveBeenCalledWith('shell:openExternal', {
      url: 'https://example.com',
    });
  });

  it('should reject membership openExternal when main process fails to open url', async () => {
    electronMocks.invoke.mockResolvedValueOnce(false);
    const api = await loadDesktopApi();

    await expect(api.membership.openExternal('https://example.com')).rejects.toThrow(
      'Failed to open external URL'
    );
  });

  it('should reject payment openCheckout when main process fails to open url', async () => {
    electronMocks.invoke.mockResolvedValueOnce(false);
    const api = await loadDesktopApi();

    await expect(api.payment.openCheckout('https://example.com')).rejects.toThrow(
      'Failed to open external URL'
    );
  });
});
