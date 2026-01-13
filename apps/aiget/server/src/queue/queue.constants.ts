// 队列名称
export const SCREENSHOT_QUEUE = 'screenshot';
export const SCRAPE_QUEUE = 'scrape';
export const CRAWL_QUEUE = 'crawl';
export const BATCH_SCRAPE_QUEUE = 'batch-scrape';

// Digest 队列名称（BullMQ 不允许队列名包含冒号）
export const DIGEST_SUBSCRIPTION_SCHEDULER_QUEUE =
  'digest-subscription-scheduler';
export const DIGEST_SUBSCRIPTION_RUN_QUEUE = 'digest-subscription-run';
export const DIGEST_TOPIC_SCHEDULER_QUEUE = 'digest-topic-scheduler';
export const DIGEST_TOPIC_EDITION_QUEUE = 'digest-topic-edition-run';
export const DIGEST_CONTENT_INGEST_QUEUE = 'digest-content-ingest';
export const DIGEST_SOURCE_REFRESH_QUEUE = 'digest-source-refresh';

// 任务名称
export const SCREENSHOT_JOBS = {
  CAPTURE: 'capture', // 截图任务
  CLEANUP: 'cleanup', // 清理过期文件
  WEBHOOK_DELIVERY: 'webhook', // Webhook 发送
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

// ========== Digest 任务数据类型 ==========

/** 订阅运行任务数据 */
export interface DigestSubscriptionRunJobData {
  subscriptionId: string;
  runId: string;
  userId: string;
  outputLocale: string;
  source: 'SCHEDULED' | 'MANUAL';
}

/** Topic Edition 运行任务数据 */
export interface DigestTopicEditionJobData {
  topicId: string;
  editionId: string;
  outputLocale: string;
}

/** 内容入池任务数据 */
export interface DigestContentIngestJobData {
  url: string;
  title: string;
  description?: string;
  fulltext?: string;
  publishedAt?: string; // ISO 日期字符串
  siteName?: string;
  favicon?: string;
  author?: string;
  imageUrl?: string;
  sourceId?: string; // 关联的 DigestSource
}

/** Source 刷新任务数据 */
export interface DigestSourceRefreshJobData {
  sourceId: string;
  url: string;
  sourceType: 'RSS' | 'WEBPAGE' | 'API';
}
