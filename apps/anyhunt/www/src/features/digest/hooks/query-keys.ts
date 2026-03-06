/**
 * [PROVIDES]: digest query key factory
 * [POS]: shared query key source for digest hooks
 */

import type { InboxQueryParams } from '../types';

export const digestKeys = {
  all: ['digest'] as const,
  subscriptions: () => [...digestKeys.all, 'subscriptions'] as const,
  subscription: (id: string) => [...digestKeys.subscriptions(), id] as const,
  inbox: () => [...digestKeys.all, 'inbox'] as const,
  inboxItems: (params?: InboxQueryParams) => [...digestKeys.inbox(), 'items', params] as const,
  inboxStats: () => [...digestKeys.inbox(), 'stats'] as const,
  inboxItemContent: (itemId: string) => [...digestKeys.inbox(), 'content', itemId] as const,
  runs: (subscriptionId: string) => [...digestKeys.all, 'runs', subscriptionId] as const,
  topics: () => [...digestKeys.all, 'topics'] as const,
  publicTopic: (slug: string) => [...digestKeys.all, 'public-topic', slug] as const,
  feedback: (subscriptionId: string) => [...digestKeys.all, 'feedback', subscriptionId] as const,
  feedbackSuggestions: (subscriptionId: string) =>
    [...digestKeys.feedback(subscriptionId), 'suggestions'] as const,
  feedbackStats: (subscriptionId: string) =>
    [...digestKeys.feedback(subscriptionId), 'stats'] as const,
};
