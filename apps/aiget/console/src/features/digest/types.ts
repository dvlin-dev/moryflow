/**
 * Digest Types
 *
 * [DEFINES]: Digest module types for console
 * [POS]: Type definitions for subscriptions, inbox, runs
 */

// ========== Subscription Types ==========

export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'DELETED';

export interface Subscription {
  id: string;
  name: string;
  topic: string;
  interests: string[];
  cron: string;
  timezone: string;
  enabled: boolean;
  outputLocale: string;
  minItems: number;
  searchLimit: number;
  minScore: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionRequest {
  name: string;
  topic: string;
  interests?: string[];
  cron?: string;
  timezone?: string;
  outputLocale?: string;
  minItems?: number;
  searchLimit?: number;
  minScore?: number;
}

export interface UpdateSubscriptionRequest {
  name?: string;
  interests?: string[];
  cron?: string;
  timezone?: string;
  outputLocale?: string;
  minItems?: number;
  searchLimit?: number;
  minScore?: number;
}

export interface SubscriptionQueryParams {
  cursor?: string;
  limit?: number;
  enabled?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

// ========== Inbox Types ==========

export type InboxItemState = 'UNREAD' | 'READ' | 'SAVED' | 'NOT_INTERESTED';

export interface InboxItem {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  contentId: string;
  rank: number;
  scoreRelevance: number;
  scoreOverall: number;
  scoringReason: string | null;
  titleSnapshot: string;
  urlSnapshot: string;
  aiSummarySnapshot: string | null;
  state: InboxItemState;
  deliveredAt: string;
  readAt: string | null;
  savedAt: string | null;
  siteName: string | null;
  favicon: string | null;
}

export interface InboxStats {
  total: number;
  unread: number;
  read: number;
  saved: number;
  notInterested: number;
}

export interface InboxQueryParams {
  cursor?: string;
  limit?: number;
  subscriptionId?: string;
  state?: InboxItemState;
}

// ========== Run Types ==========

export type RunStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
export type RunSource = 'SCHEDULED' | 'MANUAL';

export interface RunResult {
  itemsCandidate: number;
  itemsSelected: number;
  itemsDelivered: number;
  itemsDedupSkipped: number;
  itemsRedelivered: number;
  narrativeTokensUsed?: number;
}

export interface RunBilling {
  model: string;
  totalCredits: number;
  charged: boolean;
  breakdown: Record<
    string,
    {
      count: number;
      costPerCall: number;
      subtotalCredits: number;
    }
  >;
}

export interface Run {
  id: string;
  subscriptionId: string;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  status: RunStatus;
  source: RunSource;
  result: RunResult | null;
  billing: RunBilling | null;
  error: string | null;
  narrativeMarkdown: string | null;
}

export interface RunItem {
  id: string;
  rank: number;
  scoreRelevance: number;
  scoreOverall: number;
  scoringReason: string | null;
  titleSnapshot: string;
  urlSnapshot: string;
  aiSummarySnapshot: string | null;
}

export interface RunQueryParams {
  cursor?: string;
  limit?: number;
  status?: RunStatus;
}

// ========== Topic Types ==========

export type TopicVisibility = 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
export type TopicStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface Topic {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: TopicVisibility;
  status: TopicStatus;
  interests: string[];
  sources: string[];
  defaultCron: string;
  defaultTimezone: string;
  subscriberCount: number;
  lastEditionAt: string | null;
  createdAt: string;
}

export interface CreateTopicRequest {
  subscriptionId: string;
  slug: string;
  title: string;
  description?: string;
  visibility: TopicVisibility;
}

export interface UpdateTopicRequest {
  title?: string;
  description?: string;
  visibility?: TopicVisibility;
}
