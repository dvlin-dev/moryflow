import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
});

describe('membership auth headers', () => {
  it('only sends desktop platform metadata for main-process auth requests', async () => {
    process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173';
    process.env.MORYFLOW_DEEP_LINK_SCHEME = 'moryflow';

    const { createMembershipDeviceAuthHeaders } = await import('./membership-auth-headers');

    expect(createMembershipDeviceAuthHeaders()).toEqual({
      'X-App-Platform': 'desktop',
    });
  });
});
