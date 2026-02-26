/**
 * [DEFINES]: Digest topic domain types
 * [POS]: User topics and public follow payloads
 */

import type { DigestTopicStatus, DigestTopicVisibility } from '@/lib/digest-api';
import type { DigestLanguageMode } from './subscriptions';

export type TopicVisibility = DigestTopicVisibility;
export type TopicStatus = DigestTopicStatus;

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
  languageMode?: DigestLanguageMode;
  outputLocale?: string;
}

export interface FollowTopicResponse {
  subscriptionId: string;
  message: string;
}
