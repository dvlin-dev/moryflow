/**
 * Cloudflare Worker 类型定义
 */

/** 环境变量和绑定 */
export interface Env {
  // R2 存储桶
  SITE_BUCKET: R2Bucket;
  // 环境变量
  SITE_DOMAIN: string;
}

/** 站点状态 */
export type SiteStatus = 'ACTIVE' | 'OFFLINE' | 'DELETED';

/** 站点元数据（存储在 R2 的 _meta.json） */
export interface SiteMeta {
  siteId: string;
  type: 'MARKDOWN' | 'GENERATED';
  subdomain: string;
  status: SiteStatus;
  title: string | null;
  showWatermark: boolean;
  expiresAt?: string; // 过期时间（ISO 格式）
  routes?: {
    path: string;
    title: string | null;
  }[];
  navigation?: NavItem[];
  updatedAt: string;
}

export interface NavItem {
  title: string;
  path?: string;
  children?: NavItem[];
}

