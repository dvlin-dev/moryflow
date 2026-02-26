/**
 * Sites Feature Types
 * 站点管理相关类型定义
 */

import type { UserTier } from '@/types/api';

// ==================== 枚举类型 ====================

export type SiteStatus = 'ACTIVE' | 'OFFLINE';
export type SiteType = 'MARKDOWN' | 'GENERATED';
export type ExpiryFilter = 'expiring' | 'expired';
export type SiteActionType = 'offline' | 'online' | 'delete';

// 复用全局 UserTier 类型
export type { UserTier } from '@/types/api';

// ==================== 请求类型 ====================

export interface SiteListParams {
  search?: string;
  status?: SiteStatus;
  type?: SiteType;
  userTier?: UserTier;
  expiryFilter?: ExpiryFilter;
  limit: number;
  offset: number;
}

export interface SiteUpdateData {
  expiresAt?: string | null;
  showWatermark?: boolean;
}

// ==================== 响应类型 ====================

export interface SiteOwner {
  id: string;
  email: string;
  name: string | null;
  subscriptionTier: UserTier;
  createdAt: string;
}

export interface SiteListItem {
  id: string;
  subdomain: string;
  type: SiteType;
  status: SiteStatus;
  title: string | null;
  showWatermark: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
  pageCount: number;
  owner: SiteOwner;
}

export interface SiteListResponse {
  sites: SiteListItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface SitePage {
  id: string;
  path: string;
  title: string | null;
  localFilePath: string | null;
  localFileHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SiteDetail {
  id: string;
  subdomain: string;
  type: SiteType;
  status: SiteStatus;
  title: string | null;
  description: string | null;
  favicon: string | null;
  showWatermark: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
  owner: SiteOwner;
  pages: SitePage[];
}

export interface SiteStats {
  total: number;
  byStatus: {
    active: number;
    offline: number;
  };
  byType: {
    markdown: number;
    generated: number;
  };
  expiringSoon: number;
  expired: number;
}
