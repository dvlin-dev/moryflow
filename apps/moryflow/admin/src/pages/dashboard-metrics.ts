/**
 * [PROVIDES]: getPaidUsers - 计算付费用户总数（starter/basic/pro）
 * [DEPENDS]: SystemStats['usersByTier'] 类型定义
 * [POS]: 仪表盘统计工具函数，被 DashboardPage 与其单测复用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */
import type { SystemStats } from '@/types/api';

export function getPaidUsers(usersByTier?: SystemStats['usersByTier']): number {
  if (!usersByTier) {
    return 0;
  }
  return (usersByTier.starter || 0) + (usersByTier.basic || 0) + (usersByTier.pro || 0);
}
