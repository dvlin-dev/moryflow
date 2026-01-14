/**
 * [DEFINES]: Digest module types
 * [POS]: Type definitions for subscriptions, inbox, runs, topics
 */

// ========== Common ==========

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ========== Subscription ==========

export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'DELETED';
export type DigestLanguageMode = 'FOLLOW_UI' | 'FIXED';
export type RedeliveryPolicy = 'NEVER' | 'COOLDOWN' | 'ON_CONTENT_UPDATE';
export type DigestTone = 'neutral' | 'opinionated' | 'concise';

export interface Subscription {
  id: string;
  name: string;
  topic: string;
  interests: string[];
  searchLimit: number;
  scrapeLimit: number;
  minScore: number;
  redeliveryPolicy: RedeliveryPolicy;
  redeliveryCooldownDays: number;
  languageMode: DigestLanguageMode;
  cron: string;
  timezone: string;
  enabled: boolean;
  outputLocale: string;
  minItems: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  followedTopicId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionInput {
  name: string;
  topic: string;
  interests?: string[];

  searchLimit?: number;
  scrapeLimit?: number;
  minItems?: number;
  minScore?: number;
  contentWindowHours?: number;

  redeliveryPolicy?: RedeliveryPolicy;
  redeliveryCooldownDays?: number;

  followedTopicId?: string;

  cron: string;
  timezone?: string;

  languageMode?: DigestLanguageMode;
  outputLocale?: string;

  inboxEnabled?: boolean;
  emailEnabled?: boolean;
  emailTo?: string;
  emailSubjectTemplate?: string;
  webhookUrl?: string;
  webhookEnabled?: boolean;

  generateItemSummaries?: boolean;
  composeNarrative?: boolean;
  tone?: DigestTone;

  enabled?: boolean;
}

export interface UpdateSubscriptionInput {
  name?: string;
  topic?: string;
  interests?: string[];
  searchLimit?: number;
  scrapeLimit?: number;
  minItems?: number;
  minScore?: number;
  contentWindowHours?: number;

  redeliveryPolicy?: RedeliveryPolicy;
  redeliveryCooldownDays?: number;

  followedTopicId?: string;

  cron?: string;
  timezone?: string;
  languageMode?: DigestLanguageMode;
  outputLocale?: string;
  inboxEnabled?: boolean;
  emailEnabled?: boolean;
  emailTo?: string;
  emailSubjectTemplate?: string;
  webhookUrl?: string;
  webhookEnabled?: boolean;
  generateItemSummaries?: boolean;
  composeNarrative?: boolean;
  tone?: DigestTone;
  enabled?: boolean;
}

export interface SubscriptionQueryParams {
  page?: number;
  limit?: number;
  enabled?: boolean;
  followedTopicId?: string;
}

export interface TriggerRunResponse {
  runId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  message: string;
}

// ========== Inbox ==========

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
  outputLocale: string;
  result: RunResult | null;
  billing: RunBilling | null;
  error: string | null;
  narrativeMarkdown?: string | null;
}

export interface RunQueryParams {
  page?: number;
  limit?: number;
  status?: RunStatus;
}

// ========== Topic ==========

export type TopicVisibility = 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
export type TopicStatus = 'ACTIVE' | 'PAUSED_INSUFFICIENT_CREDITS' | 'PAUSED_BY_ADMIN';

export interface Topic {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: TopicVisibility;
  status: TopicStatus;
  topic: string;
  interests: string[];
  locale: string;
  cron: string;
  timezone: string;
  subscriberCount: number;
  lastEditionAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface UserTopicsResponse {
  items: Topic[];
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
  status: TopicStatus;
  topic: string;
  interests: string[];
  locale: string;
  cron: string;
  timezone: string;
  subscriberCount: number;
  lastEditionAt: string | null;
  createdByUserId: string | null;
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
