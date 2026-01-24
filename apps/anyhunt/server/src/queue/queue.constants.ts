// 队列名称
export const SCRAPE_QUEUE = 'scrape';
export const CRAWL_QUEUE = 'crawl';
export const BATCH_SCRAPE_QUEUE = 'batch-scrape';

// Digest 队列名称（BullMQ 不允许队列名包含冒号）
export const DIGEST_SUBSCRIPTION_SCHEDULER_QUEUE =
  'digest-subscription-scheduler';
export const DIGEST_SUBSCRIPTION_RUN_QUEUE = 'digest-subscription-run';
export const DIGEST_SOURCE_REFRESH_QUEUE = 'digest-source-refresh';
export const DIGEST_SOURCE_SCHEDULER_QUEUE = 'digest-source-scheduler';

// Digest 通知投递队列
export const DIGEST_WEBHOOK_DELIVERY_QUEUE = 'digest-webhook-delivery';
export const DIGEST_EMAIL_DELIVERY_QUEUE = 'digest-email-delivery';

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

// ========== Digest 通知投递任务数据类型 ==========

/** Webhook 投递任务数据 */
export interface DigestWebhookDeliveryJobData {
  runId: string;
  subscriptionId: string;
  userId: string;
  webhookUrl: string;
  event: 'digest.run.completed' | 'digest.run.failed';
  payload: {
    runId: string;
    subscriptionId: string;
    subscriptionName: string;
    status: 'completed' | 'failed';
    itemsDelivered: number;
    narrativeMarkdown?: string;
    items: Array<{
      title: string;
      url: string;
      aiSummary?: string;
      scoreOverall: number;
    }>;
    timestamp: string;
  };
}

/** Email 投递任务数据 */
export interface DigestEmailDeliveryJobData {
  runId: string;
  subscriptionId: string;
  userId: string;
  emailTo: string;
  emailSubject: string;
  subscriptionName: string;
  itemsCount: number;
  narrativeMarkdown?: string;
  items: Array<{
    title: string;
    url: string;
    aiSummary?: string;
  }>;
  viewUrl: string;
  unsubscribeUrl?: string;
}
