// ============ 订阅套餐 ============

export const SubscriptionTier = {
  FREE: 'FREE',
  BASIC: 'BASIC',
  PRO: 'PRO',
  TEAM: 'TEAM',
} as const;

export type SubscriptionTier = (typeof SubscriptionTier)[keyof typeof SubscriptionTier];

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  CANCELED: 'CANCELED',
  PAST_DUE: 'PAST_DUE',
  EXPIRED: 'EXPIRED',
} as const;

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export interface TierConfig {
  tier: SubscriptionTier;
  price: {
    monthly: number;    // 美分
    yearly: number;
  };
  quota: {
    monthly: number;    // 月度配额
  };
  limits: {
    maxWidth: number;
    maxHeight: number;
    maxDelay: number;       // 最大等待时间 ms
    ratePerMinute: number;  // 频率限制
    maxConcurrent: number;  // 并发限制
  };
  storage: {
    retentionDays: number;  // 文件保留天数
  };
  features: {
    fullPage: boolean;
    clip: boolean;      // 元素截图
    scripts: boolean;   // 自定义 JS
    webhook: boolean;
    noWatermark: boolean;
  };
}

export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
  [SubscriptionTier.FREE]: {
    tier: SubscriptionTier.FREE,
    price: { monthly: 0, yearly: 0 },
    quota: { monthly: 100 },
    limits: {
      maxWidth: 1280,
      maxHeight: 800,
      maxDelay: 3000,
      ratePerMinute: 10,
      maxConcurrent: 2,
    },
    storage: {
      retentionDays: 7,
    },
    features: {
      fullPage: true,
      clip: false,
      scripts: false,
      webhook: false,
      noWatermark: false,
    },
  },
  [SubscriptionTier.BASIC]: {
    tier: SubscriptionTier.BASIC,
    price: { monthly: 900, yearly: 9000 },
    quota: { monthly: 5000 },
    limits: {
      maxWidth: 2560,
      maxHeight: 1440,
      maxDelay: 5000,
      ratePerMinute: 30,
      maxConcurrent: 5,
    },
    storage: {
      retentionDays: 30,
    },
    features: {
      fullPage: true,
      clip: true,
      scripts: false,
      webhook: false,
      noWatermark: true,
    },
  },
  [SubscriptionTier.PRO]: {
    tier: SubscriptionTier.PRO,
    price: { monthly: 2900, yearly: 29000 },
    quota: { monthly: 20000 },
    limits: {
      maxWidth: 3840,
      maxHeight: 2160,
      maxDelay: 10000,
      ratePerMinute: 60,
      maxConcurrent: 10,
    },
    storage: {
      retentionDays: 90,
    },
    features: {
      fullPage: true,
      clip: true,
      scripts: true,
      webhook: true,
      noWatermark: true,
    },
  },
  [SubscriptionTier.TEAM]: {
    tier: SubscriptionTier.TEAM,
    price: { monthly: 7900, yearly: 79000 },
    quota: { monthly: 60000 },
    limits: {
      maxWidth: 3840,
      maxHeight: 2160,
      maxDelay: 10000,
      ratePerMinute: 120,
      maxConcurrent: 20,
    },
    storage: {
      retentionDays: 365,
    },
    features: {
      fullPage: true,
      clip: true,
      scripts: true,
      webhook: true,
      noWatermark: true,
    },
  },
};

// 按量购买价格（阶梯定价，单位：美分/次）
export const QUOTA_PRICING = [
  { min: 1, max: 1000, pricePerUnit: 0.4 },
  { min: 1001, max: 10000, pricePerUnit: 0.3 },
  { min: 10001, max: 50000, pricePerUnit: 0.25 },
  { min: 50001, max: Infinity, pricePerUnit: 0.2 },
];
