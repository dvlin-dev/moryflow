/**
 * [DEFINES]: Browser 模块公共类型与上下文配置
 * [USED_BY]: browser-pool.ts, session.manager.ts
 * [POS]: Browser 模块类型边界（避免跨模块耦合）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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

/** 浏览器上下文配置（只包含可控参数） */
export interface BrowserContextOptions {
  /** 视口尺寸 */
  viewport?: { width: number; height: number };
  /** 自定义 User-Agent */
  userAgent?: string;
  /** 是否启用 JavaScript */
  javaScriptEnabled?: boolean;
  /** 是否忽略 HTTPS 错误 */
  ignoreHTTPSErrors?: boolean;
  /** 语言 */
  locale?: string;
  /** 时区 */
  timezoneId?: string;
  /** 区域提示（URL/TLD），用于 locale/timezone 自动对齐 */
  regionHint?: string;
  /** 地理位置 */
  geolocation?: { latitude: number; longitude: number; accuracy?: number };
  /** 权限 */
  permissions?: string[];
  /** 媒体模拟 */
  colorScheme?: 'light' | 'dark' | 'no-preference';
  reducedMotion?: 'reduce' | 'no-preference';
  /** 全局 headers */
  extraHTTPHeaders?: Record<string, string>;
  /** HTTP 基本认证 */
  httpCredentials?: { username: string; password: string };
  /** 设备参数 */
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  /** 是否接受下载 */
  acceptDownloads?: boolean;
  /** 录屏参数 */
  recordVideo?: {
    dir: string;
    size?: { width: number; height: number };
  };
  /** 运行时 offline 设置（需在 context 创建后应用） */
  offline?: boolean;
}

/** 等待队列项 */
export interface WaitingRequest {
  resolve: (context: BrowserContext) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
  options?: BrowserContextOptions;
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
