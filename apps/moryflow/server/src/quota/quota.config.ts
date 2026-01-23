/**
 * Quota Configuration
 * 用户存储和向量化额度配置
 */

import type { SubscriptionTier } from '../types';

/**
 * 额度配置
 */
export interface QuotaConfig {
  /** 单文件大小限制（字节） */
  maxFileSize: number;
  /** 总存储限制（字节） */
  maxStorage: number;
  /** 最大向量化文件数 */
  maxVectorizedFiles: number;
  /** 最大站点数（-1 表示无限） */
  maxSites: number;
}

/**
 * 各等级额度配置
 */
export const QUOTA_CONFIG: Record<SubscriptionTier, QuotaConfig> = {
  free: {
    maxFileSize: 1 * 1024 * 1024, // 1 MB
    maxStorage: 50 * 1024 * 1024, // 50 MB
    maxVectorizedFiles: 100,
    maxSites: 1,
  },
  starter: {
    maxFileSize: 5 * 1024 * 1024, // 5 MB
    maxStorage: 500 * 1024 * 1024, // 500 MB
    maxVectorizedFiles: 1000,
    maxSites: 3,
  },
  basic: {
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    maxStorage: 1 * 1024 * 1024 * 1024, // 1 GB
    maxVectorizedFiles: 3000,
    maxSites: -1, // 无限
  },
  pro: {
    maxFileSize: 100 * 1024 * 1024, // 100 MB
    maxStorage: 10 * 1024 * 1024 * 1024, // 10 GB
    maxVectorizedFiles: 10000,
    maxSites: -1, // 无限
  },
  license: {
    // License 用户享有 Pro 级别额度
    maxFileSize: 100 * 1024 * 1024, // 100 MB
    maxStorage: 10 * 1024 * 1024 * 1024, // 10 GB
    maxVectorizedFiles: 10000,
    maxSites: -1, // 无限
  },
};

/**
 * 获取用户等级的额度配置
 */
export function getQuotaConfig(tier: SubscriptionTier): QuotaConfig {
  return QUOTA_CONFIG[tier];
}
