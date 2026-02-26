/**
 * [INPUT]: inbox mapper state/action samples
 * [OUTPUT]: state mapping and optimistic transition assertions
 * [POS]: digest inbox mapper regression tests
 */

import { describe, expect, it } from 'vitest';
import {
  applyInboxItemAction,
  mapInboxItemWithState,
  resolveInboxItemState,
  shouldKeepInboxItemForQuery,
  updateInboxStatsForItemChange,
  type InboxItemWithoutState,
} from '../mappers/inbox-item-state';

function createInboxItem(seed: Partial<InboxItemWithoutState> = {}) {
  const base: InboxItemWithoutState = {
    id: 'item_1',
    runId: 'run_1',
    subscriptionId: 'sub_1',
    subscriptionName: 'Subscription',
    contentId: 'content_1',
    canonicalUrlHash: 'hash_1',
    rank: 1,
    scoreRelevance: 0.9,
    scoreOverall: 0.9,
    scoringReason: null,
    titleSnapshot: 'Title',
    urlSnapshot: 'https://example.com/article',
    aiSummarySnapshot: null,
    deliveredAt: '2026-02-26T00:00:00.000Z',
    readAt: null,
    savedAt: null,
    notInterestedAt: null,
    siteName: 'Example',
    favicon: null,
    ...seed,
  };

  return mapInboxItemWithState(base);
}

describe('inbox-item-state mapper', () => {
  it('resolves state with priority: SAVED > NOT_INTERESTED > READ > UNREAD', () => {
    expect(resolveInboxItemState({ readAt: null, savedAt: '2026-02-01', notInterestedAt: null })).toBe(
      'SAVED'
    );
    expect(
      resolveInboxItemState({ readAt: '2026-02-01', savedAt: null, notInterestedAt: '2026-02-02' })
    ).toBe('NOT_INTERESTED');
    expect(resolveInboxItemState({ readAt: '2026-02-01', savedAt: null, notInterestedAt: null })).toBe(
      'READ'
    );
    expect(resolveInboxItemState({ readAt: null, savedAt: null, notInterestedAt: null })).toBe(
      'UNREAD'
    );
  });

  it('applies save/not-interested/read actions and keeps derived state in sync', () => {
    const nowIso = '2026-02-26T08:00:00.000Z';
    const unreadItem = createInboxItem();

    const saved = applyInboxItemAction(unreadItem, 'save', nowIso);
    expect(saved.savedAt).toBe(nowIso);
    expect(saved.state).toBe('SAVED');

    const notInterested = applyInboxItemAction(unreadItem, 'notInterested', nowIso);
    expect(notInterested.notInterestedAt).toBe(nowIso);
    expect(notInterested.state).toBe('NOT_INTERESTED');

    const read = applyInboxItemAction(unreadItem, 'markRead', nowIso);
    expect(read.readAt).toBe(nowIso);
    expect(read.state).toBe('READ');
  });

  it('filters inbox items by query params', () => {
    const saved = createInboxItem({ id: 'saved', savedAt: '2026-02-26T01:00:00.000Z' });
    const unread = createInboxItem({ id: 'unread' });

    expect(shouldKeepInboxItemForQuery(saved, { subscriptionId: 'sub_1', state: 'SAVED' })).toBe(true);
    expect(shouldKeepInboxItemForQuery(saved, { subscriptionId: 'sub_2' })).toBe(false);
    expect(shouldKeepInboxItemForQuery(unread, { state: 'SAVED' })).toBe(false);
    expect(shouldKeepInboxItemForQuery(unread, undefined)).toBe(true);
  });

  it('updates unread/saved counters without going negative', () => {
    const stats = { totalCount: 10, unreadCount: 1, savedCount: 0 };
    const previousItem = createInboxItem({ id: 'x' });
    const nextItem = applyInboxItemAction(previousItem, 'save', '2026-02-26T02:00:00.000Z');

    const updated = updateInboxStatsForItemChange(stats, previousItem, nextItem);
    expect(updated.unreadCount).toBe(0);
    expect(updated.savedCount).toBe(1);

    const backToUnread = applyInboxItemAction(nextItem, 'unsave', '2026-02-26T03:00:00.000Z');
    const restored = updateInboxStatsForItemChange(updated, nextItem, backToUnread);
    expect(restored.unreadCount).toBe(1);
    expect(restored.savedCount).toBe(0);
  });
});
