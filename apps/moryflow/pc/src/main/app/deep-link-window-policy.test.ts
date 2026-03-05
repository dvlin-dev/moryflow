import { describe, expect, it } from 'vitest';
import { hasLiveWindowForDeepLink } from './deep-link-window-policy.js';

describe('deep-link-window-policy', () => {
  it('returns false when no windows exist', () => {
    expect(hasLiveWindowForDeepLink([])).toBe(false);
  });

  it('returns false when all windows are destroyed', () => {
    expect(
      hasLiveWindowForDeepLink([{ isDestroyed: () => true }, { isDestroyed: () => true }])
    ).toBe(false);
  });

  it('returns true when at least one window is alive', () => {
    expect(
      hasLiveWindowForDeepLink([{ isDestroyed: () => true }, { isDestroyed: () => false }])
    ).toBe(true);
  });
});
