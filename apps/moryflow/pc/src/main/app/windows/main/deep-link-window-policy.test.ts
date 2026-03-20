import { describe, expect, it } from 'vitest';
import { hasMainWindowForDeepLink } from './deep-link-window-policy.js';

describe('deep-link-window-policy', () => {
  it('returns false when main window is null', () => {
    expect(hasMainWindowForDeepLink(null)).toBe(false);
  });

  it('returns false when main window is destroyed', () => {
    expect(hasMainWindowForDeepLink({ isDestroyed: () => true })).toBe(false);
  });

  it('returns true when main window is alive', () => {
    expect(hasMainWindowForDeepLink({ isDestroyed: () => false })).toBe(true);
  });
});
