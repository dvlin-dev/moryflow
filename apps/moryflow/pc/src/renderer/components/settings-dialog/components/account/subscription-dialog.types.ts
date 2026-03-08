import type { LucideIcon } from 'lucide-react';
import type { TranslationKeys } from '@moryflow/i18n';
import type { UserTier } from '@/lib/server/types';

export type SubscriptionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: UserTier;
};

export type BillingCycle = 'monthly' | 'yearly';

/** Subscribable tiers (subset of UserTier) */
export type SubscriptionTier = Extract<UserTier, 'starter' | 'basic' | 'pro'>;

export type AccentColor = 'emerald' | 'sky' | 'zinc';

type SettingsKey = TranslationKeys<'settings'>;

export type PlanConfig = {
  tier: SubscriptionTier;
  nameKey: SettingsKey;
  taglineKey: SettingsKey;
  icon: LucideIcon;
  accentColor: AccentColor;
  popular?: boolean;
};
