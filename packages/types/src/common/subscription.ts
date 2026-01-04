/**
 * [DEFINES]: 统一平台订阅等级、订阅状态、订阅配置类型
 * [USED_BY]: 所有产品的服务端和客户端
 * [POS]: 统一身份平台核心类型
 */

// ============ 订阅等级 ============

export const SubscriptionTier = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  PRO: 'PRO',
  MAX: 'MAX',
} as const;

export type SubscriptionTier = (typeof SubscriptionTier)[keyof typeof SubscriptionTier];

// ============ 订阅状态 ============

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  CANCELED: 'CANCELED',
  PAST_DUE: 'PAST_DUE',
  EXPIRED: 'EXPIRED',
  TRIALING: 'TRIALING',
} as const;

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

// ============ 订阅周期 ============

export const SubscriptionPeriod = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const;

export type SubscriptionPeriod = (typeof SubscriptionPeriod)[keyof typeof SubscriptionPeriod];

// ============ 订阅配置 ============

export interface SubscriptionConfig {
  tier: SubscriptionTier;
  price: {
    monthly: number; // 美分
    yearly: number;
  };
  credits: {
    monthly: number; // 每月赠送积分
  };
  features: {
    allProductsAccess: boolean;
    prioritySupport: boolean;
  };
}

export const SUBSCRIPTION_CONFIGS: Record<SubscriptionTier, SubscriptionConfig> = {
  [SubscriptionTier.FREE]: {
    tier: SubscriptionTier.FREE,
    price: { monthly: 0, yearly: 0 },
    credits: { monthly: 100 },
    features: {
      allProductsAccess: true,
      prioritySupport: false,
    },
  },
  [SubscriptionTier.STARTER]: {
    tier: SubscriptionTier.STARTER,
    price: { monthly: 900, yearly: 9900 },
    credits: { monthly: 1000 },
    features: {
      allProductsAccess: true,
      prioritySupport: false,
    },
  },
  [SubscriptionTier.PRO]: {
    tier: SubscriptionTier.PRO,
    price: { monthly: 2900, yearly: 29900 },
    credits: { monthly: 5000 },
    features: {
      allProductsAccess: true,
      prioritySupport: false,
    },
  },
  [SubscriptionTier.MAX]: {
    tier: SubscriptionTier.MAX,
    price: { monthly: 9900, yearly: 0 }, // 无年付
    credits: { monthly: 20000 },
    features: {
      allProductsAccess: true,
      prioritySupport: true,
    },
  },
};

// ============ 订阅信息 ============

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  period: SubscriptionPeriod;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}
