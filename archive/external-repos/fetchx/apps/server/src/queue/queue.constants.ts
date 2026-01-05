// 队列名称
export const SCREENSHOT_QUEUE = 'screenshot';
export const SCRAPE_QUEUE = 'scrape';
export const CRAWL_QUEUE = 'crawl';
export const BATCH_SCRAPE_QUEUE = 'batch-scrape';

// 任务名称
export const SCREENSHOT_JOBS = {
  CAPTURE: 'capture',           // 截图任务
  CLEANUP: 'cleanup',           // 清理过期文件
  WEBHOOK_DELIVERY: 'webhook',  // Webhook 发送
} as const;

// 任务数据类型
export interface ScreenshotJobData {
  screenshotId: string;
  userId: string;
  url: string;
  requestHash: string;
  options: {
    width: number;
    height: number;
    fullPage: boolean;
    format: 'png' | 'jpeg' | 'webp';
    quality?: number;
    delay?: number;
    waitFor?: string;
    clip?: string;
    hide?: string[];
    darkMode?: boolean;
    userAgent?: string;
    scripts?: string;
  };
}

export interface WebhookJobData {
  webhookId: string;
  deliveryId: string;
  url: string;
  secret: string;
  event: string;
  payload: Record<string, unknown>;
  attempt: number;
}

export interface CleanupJobData {
  batchSize: number;
  dryRun?: boolean;
}
