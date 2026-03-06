/**
 * [DEFINES]: Digest subscription domain types
 * [POS]: Subscription CRUD and scheduling payloads
 */

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
  inboxEnabled: boolean;
  emailEnabled: boolean;
  webhookEnabled: boolean;
  generateItemSummaries: boolean;
  composeNarrative: boolean;
  tone: DigestTone;
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
