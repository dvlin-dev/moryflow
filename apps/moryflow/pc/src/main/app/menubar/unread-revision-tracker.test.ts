/* @vitest-environment node */

import { describe, expect, it } from 'vitest';
import { createUnreadRevisionTracker } from './unread-revision-tracker';

describe('unread-revision-tracker', () => {
  it('should treat newer snapshot revision as unread increment', () => {
    const tracker = createUnreadRevisionTracker();

    expect(tracker.shouldIncrement('session-1', 1)).toBe(true);
    expect(tracker.shouldIncrement('session-1', 1)).toBe(false);
    expect(tracker.shouldIncrement('session-1', 2)).toBe(true);
  });

  it('should drop revision gate when session is deleted', () => {
    const tracker = createUnreadRevisionTracker();

    expect(tracker.shouldIncrement('session-1', 5)).toBe(true);
    tracker.deleteSession('session-1');

    expect(tracker.shouldIncrement('session-1', 1)).toBe(true);
  });

  it('should clear all revisions on reset', () => {
    const tracker = createUnreadRevisionTracker();

    expect(tracker.shouldIncrement('session-1', 3)).toBe(true);
    expect(tracker.shouldIncrement('session-2', 9)).toBe(true);

    tracker.clear();

    expect(tracker.shouldIncrement('session-1', 1)).toBe(true);
    expect(tracker.shouldIncrement('session-2', 1)).toBe(true);
  });
});
