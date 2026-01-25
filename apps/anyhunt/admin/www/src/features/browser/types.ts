/**
 * Browser 类型定义
 */

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

/** 浏览器池详细状态 */
export interface BrowserPoolDetailedStatus {
  /** 总实例数 */
  total: number;
  /** 健康实例数 */
  healthy: number;
  /** 当前页面总数 */
  totalPages: number;
  /** 等待队列长度 */
  waitingCount: number;
  /** 配置信息 */
  config: {
    maxPoolSize: number;
    warmupCount: number;
    maxPagesPerBrowser: number;
    maxConcurrentPages: number;
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
    poolUtilization: number;
    pageUtilization: number;
  };
  /** 各实例状态 */
  instances: BrowserInstanceStatus[];
}
