/**
 * [DEFINES]: Digest inbox domain types
 * [POS]: Inbox list/detail and item state transitions
 */

export type InboxItemState = 'UNREAD' | 'READ' | 'SAVED' | 'NOT_INTERESTED';
export type InboxItemAction =
  | 'markRead'
  | 'markUnread'
  | 'save'
  | 'unsave'
  | 'notInterested'
  | 'undoNotInterested';

export interface InboxItem {
  id: string;
  runId: string;
  subscriptionId: string;
  subscriptionName: string;
  contentId: string;
  canonicalUrlHash: string;
  rank: number;
  scoreRelevance: number;
  scoreOverall: number;
  scoringReason: string | null;
  titleSnapshot: string;
  urlSnapshot: string;
  aiSummarySnapshot: string | null;
  deliveredAt: string;
  readAt: string | null;
  savedAt: string | null;
  notInterestedAt: string | null;
  siteName: string | null;
  favicon: string | null;
  state: InboxItemState;
}

export interface InboxStats {
  totalCount: number;
  unreadCount: number;
  savedCount: number;
}

export interface InboxQueryParams {
  page?: number;
  limit?: number;
  subscriptionId?: string;
  state?: InboxItemState;
}
