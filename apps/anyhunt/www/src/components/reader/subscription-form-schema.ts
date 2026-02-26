/**
 * [DEFINES]: Subscription form schemas/defaults and interest parser
 * [USED_BY]: CreateSubscriptionDialog, SubscriptionSettingsDialog
 * [POS]: Shared form contract for subscription create/update dialogs
 */

import { z } from 'zod/v3';
import { DEFAULT_SUBSCRIPTION } from '@/features/digest/constants';

const subscriptionFormShape = {
  name: z.string().min(1, 'Name is required').max(100),
  topic: z.string().min(1, 'Topic is required').max(200),
  interests: z.string().optional(),
  cron: z.string().min(1),
  timezone: z.string().min(1),
  outputLocale: z.string().min(1),
  minItems: z.coerce.number().min(1).max(50),
  minScore: z.coerce.number().min(0).max(100),
  searchLimit: z.coerce.number().min(10).max(100),
  generateItemSummaries: z.boolean(),
  composeNarrative: z.boolean(),
  tone: z.enum(['neutral', 'opinionated', 'concise']),
  inboxEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  emailTo: z.string().email().optional().or(z.literal('')),
  webhookEnabled: z.boolean(),
  webhookUrl: z.string().url().optional().or(z.literal('')),
};

export const createSubscriptionFormSchema = z.object(subscriptionFormShape);

export const updateSubscriptionFormSchema = z.object({
  ...subscriptionFormShape,
  enabled: z.boolean(),
});

export type CreateSubscriptionFormValues = z.infer<typeof createSubscriptionFormSchema>;
export type UpdateSubscriptionFormValues = z.infer<typeof updateSubscriptionFormSchema>;

export function getCreateSubscriptionDefaultValues(): CreateSubscriptionFormValues {
  return {
    name: '',
    topic: '',
    interests: '',
    cron: DEFAULT_SUBSCRIPTION.cron,
    timezone: DEFAULT_SUBSCRIPTION.timezone,
    outputLocale: DEFAULT_SUBSCRIPTION.outputLocale,
    minItems: DEFAULT_SUBSCRIPTION.minItems,
    minScore: DEFAULT_SUBSCRIPTION.minScore,
    searchLimit: DEFAULT_SUBSCRIPTION.searchLimit,
    generateItemSummaries: true,
    composeNarrative: false,
    tone: 'neutral',
    inboxEnabled: true,
    emailEnabled: false,
    emailTo: '',
    webhookEnabled: false,
    webhookUrl: '',
  };
}

export function getUpdateSubscriptionDefaultValues(): UpdateSubscriptionFormValues {
  return {
    ...getCreateSubscriptionDefaultValues(),
    enabled: true,
  };
}

export function parseInterestsInput(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
}
