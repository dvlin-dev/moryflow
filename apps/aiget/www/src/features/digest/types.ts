/**
 * [DEFINES]: Digest module types
 * [POS]: Type definitions for subscriptions, inbox, runs, topics
 */

// ========== Common ==========

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

// ========== Subscription ==========

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

export interface CreateSubscriptionInput {
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

export interface UpdateSubscriptionInput {
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

// ========== Inbox ==========

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

// ========== Run ==========

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

// ========== Topic ==========

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

export interface CreateTopicInput {
  subscriptionId: string;
  slug: string;
  title: string;
  description?: string;
  visibility: TopicVisibility;
}

export interface UpdateTopicInput {
  title?: string;
  description?: string;
  visibility?: TopicVisibility;
}

// ========== Public Topic (for Follow) ==========

export interface PublicTopic {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: TopicVisibility;
  status: string;
  topic: string;
  interests: string[];
  locale: string;
  cron: string;
  timezone: string;
  subscriberCount: number;
  lastEditionAt: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface FollowTopicInput {
  cron?: string;
  timezone?: string;
  minItems?: number;
  minScore?: number;
  interests?: string[];
  languageMode?: 'FOLLOW_UI' | 'FIXED';
  outputLocale?: string;
}

export interface FollowTopicResponse {
  subscriptionId: string;
  message: string;
}
