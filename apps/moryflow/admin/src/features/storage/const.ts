/**
 * 云同步管理常量和工具函数
 */

/** 默认分页大小 */
export const DEFAULT_PAGE_SIZE = 20;

/** Query Keys */
export const STORAGE_QUERY_KEYS = {
  all: ['storage'] as const,
  stats: () => [...STORAGE_QUERY_KEYS.all, 'stats'] as const,
  vaults: () => [...STORAGE_QUERY_KEYS.all, 'vaults'] as const,
  vaultList: (params: Record<string, unknown>) =>
    [...STORAGE_QUERY_KEYS.vaults(), 'list', params] as const,
  vaultDetail: (id: string) => [...STORAGE_QUERY_KEYS.vaults(), 'detail', id] as const,
  users: () => [...STORAGE_QUERY_KEYS.all, 'users'] as const,
  userList: (params: Record<string, unknown>) =>
    [...STORAGE_QUERY_KEYS.users(), 'list', params] as const,
  userDetail: (userId: string) => [...STORAGE_QUERY_KEYS.users(), 'detail', userId] as const,
  vectorized: () => [...STORAGE_QUERY_KEYS.all, 'vectorized'] as const,
  vectorizedList: (params: Record<string, unknown>) =>
    [...STORAGE_QUERY_KEYS.vectorized(), 'list', params] as const,
};

/**
 * 格式化字节大小
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 计算使用率百分比
 */
export function calculateUsagePercent(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.round((used / limit) * 100);
}

/**
 * 根据使用率返回颜色类名
 */
export function getUsageColorClass(percent: number): string {
  if (percent >= 90) return 'text-red-500';
  if (percent >= 70) return 'text-yellow-500';
  return 'text-green-500';
}

/**
 * 根据使用率返回进度条颜色类名
 */
export function getProgressColorClass(percent: number): string {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

// 注意：formatNumber 已在 @/lib/format 中定义，请从那里导入
// 为保持向后兼容，此处重新导出
export { formatNumber } from '@/lib/format';

/**
 * 获取用户等级显示名称
 */
export function getTierDisplayName(tier: string): string {
  const tierMap: Record<string, string> = {
    free: '免费用户',
    basic: '基础会员',
    pro: 'Pro 会员',
  };
  return tierMap[tier] || tier;
}
