import { Crown, Sparkles, Zap } from 'lucide-react';
import type { PlanConfig } from './subscription-dialog.types';

export const SUBSCRIPTION_PLANS: PlanConfig[] = [
  {
    tier: 'starter',
    nameKey: 'starterPlan',
    taglineKey: 'starterPlanTagline',
    icon: Zap,
    accentColor: 'emerald',
  },
  {
    tier: 'basic',
    nameKey: 'basicPlan',
    taglineKey: 'basicPlanTagline',
    icon: Sparkles,
    accentColor: 'sky',
  },
  {
    tier: 'pro',
    nameKey: 'proPlan',
    taglineKey: 'proPlanTagline',
    icon: Crown,
    accentColor: 'zinc',
    popular: true,
  },
];

/** Yearly discount compared to monthly (~17%) */
export const YEARLY_DISCOUNT_PERCENT = 17;

export const COMMON_FEATURE_LIMIT = 3;
