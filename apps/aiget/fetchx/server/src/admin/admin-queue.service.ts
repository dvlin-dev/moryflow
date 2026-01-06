/**
 * Admin Queue Service
 * 队列监控与操作
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import {
  SCREENSHOT_QUEUE,
  SCRAPE_QUEUE,
  CRAWL_QUEUE,
  BATCH_SCRAPE_QUEUE,
} from '../queue/queue.constants';
import type { QueueJobsQuery } from './dto';

// 队列名称映射
const QUEUE_NAMES = [
  SCREENSHOT_QUEUE,
  SCRAPE_QUEUE,
  CRAWL_QUEUE,
  BATCH_SCRAPE_QUEUE,
] as const;

@Injectable()
export class AdminQueueService {
  private readonly queues: Map<string, Queue>;

  constructor(
    @InjectQueue(SCREENSHOT_QUEUE) private screenshotQueue: Queue,
    @InjectQueue(SCRAPE_QUEUE) private scrapeQueue: Queue,
    @InjectQueue(CRAWL_QUEUE) private crawlQueue: Queue,
    @InjectQueue(BATCH_SCRAPE_QUEUE) private batchScrapeQueue: Queue,
  ) {
    this.queues = new Map([
      [SCREENSHOT_QUEUE, screenshotQueue],
      [SCRAPE_QUEUE, scrapeQueue],
      [CRAWL_QUEUE, crawlQueue],
      [BATCH_SCRAPE_QUEUE, batchScrapeQueue],
    ]);
  }

  private getQueue(name: string): Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new NotFoundException(`Queue "${name}" not found`);
    }
    return queue;
  }

  /**
   * 获取所有队列状态
   */
  async getAllQueueStats() {
    const stats = await Promise.all(
      QUEUE_NAMES.map(async (name) => {
        const queue = this.getQueue(name);
        const counts = await queue.getJobCounts();
        return {
          name,
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          completed: counts.completed ?? 0,
          failed: counts.failed ?? 0,
          delayed: counts.delayed ?? 0,
          paused: counts.paused ?? 0,
        };
      }),
    );

    return {
      queues: stats,
      summary: {
        totalWaiting: stats.reduce((sum, q) => sum + q.waiting, 0),
        totalActive: stats.reduce((sum, q) => sum + q.active, 0),
        totalFailed: stats.reduce((sum, q) => sum + q.failed, 0),
      },
    };
  }

  /**
   * 获取单个队列状态
   */
  async getQueueStats(name: string) {
    const queue = this.getQueue(name);
    const counts = await queue.getJobCounts();

    return {
      name,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      paused: counts.paused ?? 0,
    };
  }

  /**
   * 获取队列任务列表
   */
  async getQueueJobs(name: string, query: QueueJobsQuery) {
    const queue = this.getQueue(name);
    const { status, page, limit } = query;

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // 获取一次 counts，避免重复调用
    const counts = await queue.getJobCounts();

    let jobs: Job[] = [];
    let total = 0;

    switch (status) {
      case 'waiting':
        jobs = await queue.getWaiting(start, end);
        total = counts.waiting ?? 0;
        break;
      case 'active':
        jobs = await queue.getActive(start, end);
        total = counts.active ?? 0;
        break;
      case 'completed':
        jobs = await queue.getCompleted(start, end);
        total = counts.completed ?? 0;
        break;
      case 'failed':
        jobs = await queue.getFailed(start, end);
        total = counts.failed ?? 0;
        break;
      case 'delayed':
        jobs = await queue.getDelayed(start, end);
        total = counts.delayed ?? 0;
        break;
    }

    return {
      items: jobs.map((job) => this.formatJob(job)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 获取单个任务详情
   */
  async getQueueJob(name: string, jobId: string) {
    const queue = this.getQueue(name);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(
        `Job "${jobId}" not found in queue "${name}"`,
      );
    }

    const state = await job.getState();
    const logs = await queue.getJobLogs(jobId);

    return {
      ...this.formatJob(job),
      state,
      logs: logs.logs,
      stacktrace: job.stacktrace,
      returnvalue: job.returnvalue as unknown,
    };
  }

  /**
   * 重试单个失败任务
   */
  async retryJob(name: string, jobId: string) {
    const queue = this.getQueue(name);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`Job "${jobId}" not found`);
    }

    await job.retry();
    return { success: true, jobId };
  }

  /**
   * 重试所有失败任务
   */
  async retryAllFailed(name: string) {
    const queue = this.getQueue(name);
    const failed = await queue.getFailed(0, -1);

    // 使用 Promise.all 并行重试，提升性能
    await Promise.all(failed.map((job) => job.retry()));

    return { success: true, retried: failed.length };
  }

  /**
   * 清空队列（指定状态）
   */
  async cleanQueue(name: string, status: 'completed' | 'failed') {
    const queue = this.getQueue(name);
    const grace = 0; // 立即清理
    const limit = 10000;

    const removed = await queue.clean(grace, limit, status);

    return { success: true, removed: removed.length };
  }

  /**
   * 暂停队列
   */
  async pauseQueue(name: string) {
    const queue = this.getQueue(name);
    await queue.pause();
    return { success: true, paused: true };
  }

  /**
   * 恢复队列
   */
  async resumeQueue(name: string) {
    const queue = this.getQueue(name);
    await queue.resume();
    return { success: true, paused: false };
  }

  /**
   * 格式化任务数据
   */
  private formatJob(job: Job) {
    return {
      id: job.id,
      name: job.name,
      data: job.data as unknown,
      opts: {
        attempts: job.opts.attempts,
        delay: job.opts.delay,
        priority: job.opts.priority,
      },
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn ? new Date(job.processedOn) : null,
      finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
      timestamp: new Date(job.timestamp),
      failedReason: job.failedReason,
    };
  }
}
