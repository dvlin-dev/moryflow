/**
 * 用户等级相关常量
 */
import type { UserTier } from '../types/api';

export const TIER_LABELS: Record<UserTier, string> = {
  free: '免费用户',
  starter: '入门会员',
  basic: '基础会员',
  pro: '专业会员',
};

export const TIER_LABELS_SHORT: Record<UserTier, string> = {
  free: '免费',
  starter: '入门',
  basic: '基础',
  pro: '专业',
};

export const TIER_COLORS: Record<UserTier, string> = {
  free: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  starter: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  pro: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export const TIER_OPTIONS: Array<{ value: UserTier; label: string }> = [
  { value: 'free', label: '免费用户' },
  { value: 'starter', label: '入门会员' },
  { value: 'basic', label: '基础会员' },
  { value: 'pro', label: '专业会员' },
];
