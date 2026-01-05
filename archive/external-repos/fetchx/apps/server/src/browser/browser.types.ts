/**
 * Browser 模块类型定义
 */

import type { Browser, BrowserContext } from 'playwright';

/** 浏览器实例包装 */
export interface BrowserInstance {
  id: string;
  browser: Browser;
  pageCount: number;
  lastUsedAt: number;
  isHealthy: boolean;
}

/** 等待队列项 */
export interface WaitingRequest {
  resolve: (context: BrowserContext) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
}

/** 单个浏览器实例状态 */
export interface BrowserInstanceStatus {
  /** 实例 ID */
  id: string;
  /** 当前页面数 */
  pageCount: number;
  /** 是否健康 */
  isHealthy: boolean;
  /** 空闲时间（秒） */
  idleSeconds: number;
}

/** 浏览器池状态 */
export interface BrowserPoolStatus {
  /** 总实例数 */
  total: number;
  /** 健康实例数 */
  healthy: number;
  /** 当前页面总数 */
  totalPages: number;
  /** 等待队列长度 */
  waitingCount: number;
}

/** 浏览器池详细状态 */
export interface BrowserPoolDetailedStatus extends BrowserPoolStatus {
  /** 配置信息 */
  config: {
    /** 最大池大小 */
    maxPoolSize: number;
    /** 预热数量 */
    warmupCount: number;
    /** 每浏览器最大页面数 */
    maxPagesPerBrowser: number;
    /** 最大并发页面数 */
    maxConcurrentPages: number;
    /** 空闲超时（秒） */
    idleTimeoutSeconds: number;
  };
  /** 系统资源 */
  system: {
    cpuCount: number;
    totalMemoryGB: number;
    freeMemoryGB: number;
  };
  /** 使用率 */
  utilization: {
    /** 池使用率 (实例数/最大池大小) */
    poolUtilization: number;
    /** 页面使用率 (页面数/最大并发页面数) */
    pageUtilization: number;
  };
  /** 各实例状态 */
  instances: BrowserInstanceStatus[];
}
