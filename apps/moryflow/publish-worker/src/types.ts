/**
 * [DEFINES]: Env / SiteMeta
 * [USED_BY]: src/handler.ts
 * [POS]: Cloudflare Worker 类型定义
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
