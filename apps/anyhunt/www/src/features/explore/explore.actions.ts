/**
 * [PROVIDES]: Explore actions (follow / create)
 * [POS]: Explore page orchestration helpers（SRP：纯函数 + API 串联；不负责 UI side effects）
 */

import { DEFAULT_SUBSCRIPTION } from '@/features/digest/constants';
import type {
  CreateSubscriptionInput,
  CreateTopicInput,
  TopicVisibility,
} from '@/features/digest/types';
import { createSubscription, createTopic, followTopic } from '@/features/digest/api';
import { isConflictApiError } from './explore-error-guards';

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function generateSubscriptionName(seed: string): string {
  const normalized = normalizeWhitespace(seed);
  return normalized.slice(0, 100) || 'New subscription';
}

export function generateTopicSlug(seed: string): string {
  return normalizeWhitespace(seed)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

export async function followPublicTopic(slug: string): Promise<void> {
  await followTopic(slug, {});
}

export async function createSubscriptionForQuery(
  query: string
): Promise<{ subscriptionId: string }> {
  const topic = normalizeWhitespace(query);
  const input: CreateSubscriptionInput = {
    name: generateSubscriptionName(topic),
    topic,
    interests: [],
    cron: DEFAULT_SUBSCRIPTION.cron,
    timezone: DEFAULT_SUBSCRIPTION.timezone,
    outputLocale: DEFAULT_SUBSCRIPTION.outputLocale,
    minItems: DEFAULT_SUBSCRIPTION.minItems,
    minScore: DEFAULT_SUBSCRIPTION.minScore,
    searchLimit: DEFAULT_SUBSCRIPTION.searchLimit,
    inboxEnabled: true,
    emailEnabled: false,
    webhookEnabled: false,
    generateItemSummaries: true,
    composeNarrative: true,
    tone: 'neutral',
    enabled: true,
  };

  const subscription = await createSubscription(input);
  return { subscriptionId: subscription.id };
}

async function createTopicWithSlug(input: CreateTopicInput): Promise<{ slug: string }> {
  const topic = await createTopic(input);
  return { slug: topic.slug };
}

export async function publishSubscriptionAsTopic(
  subscriptionId: string,
  seed: string,
  visibility: TopicVisibility
): Promise<{ slug: string }> {
  const title = generateSubscriptionName(seed);
  const baseSlug = generateTopicSlug(seed) || generateTopicSlug(title) || 'topic';

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;

    try {
      return await createTopicWithSlug({
        subscriptionId,
        slug,
        title,
        description: undefined,
        visibility: visibility as TopicVisibility,
      });
    } catch (error) {
      if (isConflictApiError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Unable to generate a unique slug for this topic');
}
