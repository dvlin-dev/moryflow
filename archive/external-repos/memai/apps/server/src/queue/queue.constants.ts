// 队列名称
export const TASK_QUEUE = 'tasks';

// 任务名称
export const TASK_JOBS = {
  WEBHOOK_DELIVERY: 'webhook',  // Webhook 发送
  EMBEDDING: 'embedding',       // 向量嵌入生成
  CLEANUP: 'cleanup',           // 清理过期数据
} as const;

// 任务数据类型
export interface WebhookJobData {
  webhookId: string;
  deliveryId: string;
  url: string;
  secret: string;
  event: string;
  payload: Record<string, unknown>;
  attempt: number;
}

export interface EmbeddingJobData {
  memoryId: string;
  content: string;
  apiKeyId: string;
}

export interface CleanupJobData {
  batchSize: number;
  dryRun?: boolean;
}
