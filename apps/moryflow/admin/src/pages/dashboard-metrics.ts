/**
 * [PROVIDES]: getPaidUsers - 计算付费用户总数（starter/basic/pro）
 * [DEPENDS]: SystemStats['usersByTier'] 类型定义
 * [POS]: 仪表盘统计工具函数，被 DashboardPage 与其单测复用
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */
import type { SystemStats } from '@/types/api';

export function getPaidUsers(usersByTier?: SystemStats['usersByTier']): number {
  if (!usersByTier) {
    return 0;
  }
  return (usersByTier.starter || 0) + (usersByTier.basic || 0) + (usersByTier.pro || 0);
}
