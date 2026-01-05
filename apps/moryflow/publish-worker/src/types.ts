/**
 * [DEFINES]: Env / SiteMeta
 * [USED_BY]: src/handler.ts
 * [POS]: Cloudflare Worker 类型定义
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 apps/moryflow/publish-worker/CLAUDE.md 的存储约定。
 */

export interface Env {
  SITE_DOMAIN: string;
  SITE_BUCKET: R2Bucket;
}

export type SiteStatus = 'ACTIVE' | 'OFFLINE' | 'DELETED';

export interface SiteRoute {
  path: string;
}

export interface SiteMeta {
  status: SiteStatus;
  expiresAt?: string;
  showWatermark?: boolean;
  routes?: SiteRoute[];
}

