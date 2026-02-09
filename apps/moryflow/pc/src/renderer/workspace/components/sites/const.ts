/**
 * [DEFINES]: Sites CMS 相关类型定义
 * [USED_BY]: SitesPage, SiteList, SiteCard, SiteDetail
 * [POS]: Sites CMS 组件目录的类型和常量中心
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { Site } from '../../../../shared/ipc/site-publish';
import type { SiteSettings } from '@/components/share/const';

// 复用 share 组件的类型和工具函数
export type { SiteSettings } from '@/components/share/const';
export { extractErrorMessage } from '@/components/share/const';

// ── 视图类型 ─────────────────────────────────────────────────

/** Sites 页面视图类型 */
export type SitesView = 'list' | 'detail';

// ── 站点操作 ─────────────────────────────────────────────────

/** 站点卡片操作类型 */
export type SiteAction =
  | 'open'
  | 'copy'
  | 'settings'
  | 'publish'
  | 'update'
  | 'unpublish'
  | 'delete';

// ── 组件 Props ───────────────────────────────────────────────

/** SiteList 组件 Props */
export interface SiteListProps {
  sites: Site[];
  loading?: boolean;
  onSiteClick: (site: Site) => void;
  onSiteAction: (siteId: string, action: SiteAction) => void;
  onPublishClick: () => void;
}

/** SiteCard 组件 Props */
export interface SiteCardProps {
  site: Site;
  onClick: () => void;
  onAction: (action: SiteAction) => void;
}

/** SiteDetail 组件 Props */
export interface SiteDetailProps {
  site: Site;
  onBack: () => void;
  /** 恢复上线（离线站点） */
  onPublish: () => void;
  /** 更新内容（在线站点） */
  onUpdate: () => void;
  onUnpublish: () => void;
  onSettingsChange: (settings: Partial<SiteSettings>) => Promise<void>;
  onDelete: () => void;
}

/** SiteEmptyState 组件 Props */
export interface SiteEmptyStateProps {
  onPublishClick: () => void;
}

// ── 辅助函数 ─────────────────────────────────────────────────

/** 格式化相对时间 */
export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return 'Never';

  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return then.toLocaleDateString();
}

/** 获取站点状态文本 */
export function getSiteStatusText(site: Site): string {
  if (site.status === 'OFFLINE') return 'Offline';
  if (site.status === 'DELETED') return 'Deleted';
  return 'Online';
}

/** 检查站点是否在线 */
export function isSiteOnline(site: Site): boolean {
  return site.status === 'ACTIVE';
}

// ── UI 常量 ─────────────────────────────────────────────────

/** 骨架屏占位符数量 */
export const SKELETON_PLACEHOLDER_COUNT = 3;
