// apps/server/src/scraper/scraper.constants.ts

// ============ 文件格式类型 ============

export type ImageFormat = 'png' | 'jpeg' | 'webp';
export type FileFormat = ImageFormat | 'pdf';

// ============ 图片处理选项 ============

export interface ProcessOptions {
  format: ImageFormat;
  quality: number;
  addWatermark: boolean;
}

export interface ProcessResult {
  buffer: Buffer;
  fileSize: number;
  width: number;
  height: number;
  processingMs: number;
}

// ============ 水印配置 ============

export const FREE_TIER_WATERMARK = 'aiget.dev';
export const WATERMARK_FONT_SIZE = 14;
export const WATERMARK_PADDING = 10;

// ============ 存储配置 ============

export const SCRAPE_STORAGE_DIR = 'scrapes';

// R2 存储路径配置
export const R2_SCRAPER_USER_ID = 'scraper';
export const R2_SCRAPER_VAULT_ID = 'public';

export const FILE_RETENTION_DAYS: Record<string, number> = {
  FREE: 7,
  BASIC: 30,
  PRO: 90,
  TEAM: 365,
};

// ============ 工具函数 ============

/**
 * 生成文件路径（R2 存储）
 */
export function generateFilePath(jobId: string, format: FileFormat): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${SCRAPE_STORAGE_DIR}/${year}/${month}/${day}/${jobId}.${format}`;
}

/**
 * 计算文件过期时间
 */
export function calculateFileExpiresAt(tier: string): Date {
  const days = FILE_RETENTION_DAYS[tier] || FILE_RETENTION_DAYS.FREE;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

/**
 * 获取 Content-Type
 */
export function getContentType(format: ImageFormat): string {
  const contentTypes: Record<ImageFormat, string> = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
  };
  return contentTypes[format];
}

/**
 * 规范化 URL
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();
    if (
      (parsed.protocol === 'http:' && parsed.port === '80') ||
      (parsed.protocol === 'https:' && parsed.port === '443')
    ) {
      parsed.port = '';
    }
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
