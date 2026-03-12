import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_RENDERER_URL = process.env.ELECTRON_RENDERER_URL;
const ORIGINAL_DEEP_LINK_SCHEME = process.env.MORYFLOW_DEEP_LINK_SCHEME;

afterEach(() => {
  vi.resetModules();

  if (ORIGINAL_RENDERER_URL === undefined) {
    delete process.env.ELECTRON_RENDERER_URL;
  } else {
    process.env.ELECTRON_RENDERER_URL = ORIGINAL_RENDERER_URL;
  }

  if (ORIGINAL_DEEP_LINK_SCHEME === undefined) {
    delete process.env.MORYFLOW_DEEP_LINK_SCHEME;
  } else {
    process.env.MORYFLOW_DEEP_LINK_SCHEME = ORIGINAL_DEEP_LINK_SCHEME;
  }
});

describe('membership auth headers', () => {
  it('uses the renderer origin while running in electron-vite dev', async () => {
    process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173';

    const { createMembershipAuthHeaders, getMembershipRequestOrigin } =
      await import('./membership-auth-headers');

    expect(getMembershipRequestOrigin()).toBe('http://localhost:5173');
    expect(createMembershipAuthHeaders()).toEqual({
      'X-App-Platform': 'desktop',
      Origin: 'http://localhost:5173',
    });
  });

  it('falls back to the packaged deep link scheme when no renderer url exists', async () => {
    delete process.env.ELECTRON_RENDERER_URL;
    process.env.MORYFLOW_DEEP_LINK_SCHEME = 'moryflow';

    const { createMembershipAuthHeaders, getMembershipRequestOrigin } =
      await import('./membership-auth-headers');

    expect(getMembershipRequestOrigin()).toBe('moryflow://');
    expect(createMembershipAuthHeaders()).toEqual({
      'X-App-Platform': 'desktop',
      Origin: 'moryflow://',
    });
  });
});
