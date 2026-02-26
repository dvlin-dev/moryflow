/**
 * [PROVIDES]: Inbox item state mappers and transition helpers
 * [DEPENDS]: digest inbox domain types
 * [POS]: Single source for inbox state derivation and optimistic update mapping
 */

import type {
  InboxItem,
  InboxItemAction,
  InboxItemState,
  InboxQueryParams,
  InboxStats,
} from '../types';

export type InboxStateSource = Pick<InboxItem, 'readAt' | 'savedAt' | 'notInterestedAt'>;
export type InboxItemWithoutState = Omit<InboxItem, 'state'>;

export function resolveInboxItemState(item: InboxStateSource): InboxItemState {
  if (item.savedAt) return 'SAVED';
  if (item.notInterestedAt) return 'NOT_INTERESTED';
  if (item.readAt) return 'READ';
  return 'UNREAD';
}

export function mapInboxItemWithState(item: InboxItemWithoutState): InboxItem {
  return {
    ...item,
    state: resolveInboxItemState(item),
  };
}

export function mapInboxItemsWithState(items: InboxItemWithoutState[]): InboxItem[] {
  return items.map((item) => mapInboxItemWithState(item));
}

export function applyInboxItemAction(item: InboxItem, action: InboxItemAction, nowIso: string): InboxItem {
  switch (action) {
    case 'markRead': {
      const next = { ...item, readAt: item.readAt ?? nowIso };
      return { ...next, state: resolveInboxItemState(next) };
    }
    case 'markUnread': {
      const next = { ...item, readAt: null };
      return { ...next, state: resolveInboxItemState(next) };
    }
    case 'save': {
      const next = { ...item, savedAt: item.savedAt ?? nowIso };
      return { ...next, state: resolveInboxItemState(next) };
    }
    case 'unsave': {
      const next = { ...item, savedAt: null };
      return { ...next, state: resolveInboxItemState(next) };
    }
    case 'notInterested': {
      const next = { ...item, notInterestedAt: item.notInterestedAt ?? nowIso };
      return { ...next, state: resolveInboxItemState(next) };
    }
    case 'undoNotInterested': {
      const next = { ...item, notInterestedAt: null };
      return { ...next, state: resolveInboxItemState(next) };
    }
    default:
      return item;
  }
}

export function shouldKeepInboxItemForQuery(item: InboxItem, params?: InboxQueryParams): boolean {
  if (params?.subscriptionId && item.subscriptionId !== params.subscriptionId) {
    return false;
  }
  if (!params?.state) {
    return true;
  }
  return item.state === params.state;
}

export function updateInboxStatsForItemChange(
  stats: InboxStats,
  previousItem: InboxItem,
  nextItem: InboxItem
): InboxStats {
  let unreadCount = stats.unreadCount;
  let savedCount = stats.savedCount;

  if (previousItem.state === 'UNREAD' && nextItem.state !== 'UNREAD') unreadCount -= 1;
  if (previousItem.state !== 'UNREAD' && nextItem.state === 'UNREAD') unreadCount += 1;

  if (previousItem.state === 'SAVED' && nextItem.state !== 'SAVED') savedCount -= 1;
  if (previousItem.state !== 'SAVED' && nextItem.state === 'SAVED') savedCount += 1;

  return {
    ...stats,
    unreadCount: Math.max(0, unreadCount),
    savedCount: Math.max(0, savedCount),
  };
}
