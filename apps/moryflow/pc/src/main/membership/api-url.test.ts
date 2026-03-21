import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_URL = process.env.VITE_MEMBERSHIP_API_URL;

afterEach(() => {
  vi.resetModules();
  if (ORIGINAL_URL === undefined) {
    delete process.env.VITE_MEMBERSHIP_API_URL;
    return;
  }
  process.env.VITE_MEMBERSHIP_API_URL = ORIGINAL_URL;
});

describe('membership-api-url', () => {
  it('prefers configured VITE_MEMBERSHIP_API_URL in main process', async () => {
    process.env.VITE_MEMBERSHIP_API_URL = 'https://staging.example.com/';

    const { MEMBERSHIP_API_URL } = await import('./api-url.js');

    expect(MEMBERSHIP_API_URL).toBe('https://staging.example.com/');
  });

  it('falls back to shared default when no override exists', async () => {
    delete process.env.VITE_MEMBERSHIP_API_URL;

    const { MEMBERSHIP_API_URL } = await import('./api-url.js');

    expect(MEMBERSHIP_API_URL).toBe('https://server.moryflow.com');
  });
});
