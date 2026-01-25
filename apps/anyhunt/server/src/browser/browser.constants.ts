/**
 * [PROVIDES]: Browser 模块运行时配置常量
 * [DEPENDS]: process.env, os.cpus/totalmem/freemem
 * [POS]: BrowserPool 与 CDP 策略配置来源
 *
 * 支持环境变量覆盖：
 * - BROWSER_POOL_SIZE: 浏览器池大小 (1-32)
 * - BROWSER_WARMUP_COUNT: 预热浏览器数量 (1-8)
 * - MAX_PAGES_PER_BROWSER: 单个浏览器最大页面数 (1-50)
 * - BROWSER_IDLE_TIMEOUT: 空闲回收时间（秒，60-3600）
 * - BROWSER_CDP_ALLOWED_HOSTS: 允许的 CDP 主机（逗号分隔）
 * - BROWSER_CDP_ALLOW_PORT: 是否允许使用 port 参数（默认 false）
 * - BROWSER_CDP_ALLOW_PRIVATE_HOSTS: 是否允许私网/本地主机（默认 false）
 * - BROWSER_DOWNLOAD_MAX_MB: 单次下载最大大小（MB，1-200）
 * - BROWSER_UPLOAD_MAX_MB: 单次上传最大大小（MB，1-50）
 * - BROWSER_STREAM_SECURE: 是否使用 wss（默认 false）
 * - BROWSER_STREAM_MAX_CLIENTS: 每个 Session 最大并发流式连接数（1-5）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { cpus, totalmem, freemem } from 'os';

/** 配置边界常量 */
const LIMITS = {
  POOL_SIZE: { min: 1, max: 32 },
  WARMUP_COUNT: { min: 1, max: 8 },
  MAX_PAGES: { min: 1, max: 50 },
  IDLE_TIMEOUT: { min: 60, max: 3600 }, // 秒
  DOWNLOAD_MAX_MB: { min: 1, max: 200 },
  UPLOAD_MAX_MB: { min: 1, max: 50 },
  STREAM_MAX_CLIENTS: { min: 1, max: 5 },
} as const;

/**
 * 安全解析环境变量为整数
 * @returns 有效值或 undefined
 */
function parseEnvInt(
  value: string | undefined,
  min: number,
  max: number,
): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return undefined;
  // 强制边界约束
  return Math.max(min, Math.min(max, parsed));
}

/**
 * 解析逗号分隔的字符串为列表
 */
function parseEnvList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * 系统资源信息
 */
export interface SystemResources {
  cpuCount: number;
  totalMemoryGB: number;
  freeMemoryGB: number;
  recommendedPoolSize: number;
  recommendedWarmupCount: number;
  recommendedMaxPages: number;
}

/**
 * 获取系统资源信息并计算推荐配置
 */
export function getSystemResources(): SystemResources {
  const cpuCount = cpus().length;
  const totalMemoryGB = totalmem() / (1024 * 1024 * 1024);
  const freeMemoryGB = freemem() / (1024 * 1024 * 1024);

  // 每个浏览器约 300-500MB，保守估计每个 500MB
  // 保留 2GB 给系统和其他服务，低内存机器至少保证能跑
  const availableMemory = Math.max(0.5, totalMemoryGB - 2);
  const memoryBasedLimit = Math.floor(availableMemory / 0.5);

  // CPU 基准：每核 2 个浏览器
  const cpuBasedLimit = cpuCount * 2;

  // 取两者较小值，应用边界约束
  const recommendedPoolSize = Math.max(
    LIMITS.POOL_SIZE.min,
    Math.min(LIMITS.POOL_SIZE.max, Math.min(memoryBasedLimit, cpuBasedLimit)),
  );

  // 预热数量：池大小的 25%，应用边界约束
  const recommendedWarmupCount = Math.max(
    LIMITS.WARMUP_COUNT.min,
    Math.min(LIMITS.WARMUP_COUNT.max, Math.floor(recommendedPoolSize / 4)),
  );

  // 每个浏览器最大页面数：内存充足时可以更多
  const recommendedMaxPages =
    totalMemoryGB >= 16 ? 15 : totalMemoryGB >= 8 ? 10 : 5;

  return {
    cpuCount,
    totalMemoryGB: Math.round(totalMemoryGB * 100) / 100,
    freeMemoryGB: Math.round(freeMemoryGB * 100) / 100,
    recommendedPoolSize,
    recommendedWarmupCount,
    recommendedMaxPages,
  };
}

// 获取系统资源推荐值
const resources = getSystemResources();

/** 浏览器池大小 */
export const BROWSER_POOL_SIZE =
  parseEnvInt(
    process.env.BROWSER_POOL_SIZE,
    LIMITS.POOL_SIZE.min,
    LIMITS.POOL_SIZE.max,
  ) ?? resources.recommendedPoolSize;

/** 预热浏览器数量 */
export const BROWSER_WARMUP_COUNT =
  parseEnvInt(
    process.env.BROWSER_WARMUP_COUNT,
    LIMITS.WARMUP_COUNT.min,
    LIMITS.WARMUP_COUNT.max,
  ) ?? resources.recommendedWarmupCount;

/** 浏览器实例空闲回收时间（ms） */
export const BROWSER_IDLE_TIMEOUT =
  (parseEnvInt(
    process.env.BROWSER_IDLE_TIMEOUT,
    LIMITS.IDLE_TIMEOUT.min,
    LIMITS.IDLE_TIMEOUT.max,
  ) ?? 5 * 60) * 1000;

/** 浏览器池获取超时（ms） */
export const BROWSER_ACQUIRE_TIMEOUT = 10000;

/** 单个浏览器最大页面数 */
export const MAX_PAGES_PER_BROWSER =
  parseEnvInt(
    process.env.MAX_PAGES_PER_BROWSER,
    LIMITS.MAX_PAGES.min,
    LIMITS.MAX_PAGES.max,
  ) ?? resources.recommendedMaxPages;

/** 默认视口宽度 */
export const DEFAULT_VIEWPORT_WIDTH = 1280;

/** 默认视口高度 */
export const DEFAULT_VIEWPORT_HEIGHT = 800;

/** 最大并发页面数 */
export const MAX_CONCURRENT_PAGES = BROWSER_POOL_SIZE * MAX_PAGES_PER_BROWSER;

/** 允许的 CDP 主机列表（空表示禁用 CDP） */
export const BROWSER_CDP_ALLOWED_HOSTS = parseEnvList(
  process.env.BROWSER_CDP_ALLOWED_HOSTS,
);

/** 是否允许通过 port 获取 CDP wsEndpoint */
export const BROWSER_CDP_ALLOW_PORT =
  process.env.BROWSER_CDP_ALLOW_PORT === 'true';

/** 是否允许私网/本地主机的 CDP 连接 */
export const BROWSER_CDP_ALLOW_PRIVATE_HOSTS =
  process.env.BROWSER_CDP_ALLOW_PRIVATE_HOSTS === 'true';

/** 单次下载最大大小（字节） */
export const BROWSER_DOWNLOAD_MAX_BYTES =
  (parseEnvInt(
    process.env.BROWSER_DOWNLOAD_MAX_MB,
    LIMITS.DOWNLOAD_MAX_MB.min,
    LIMITS.DOWNLOAD_MAX_MB.max,
  ) ?? 20) *
  1024 *
  1024;

/** 单次上传最大大小（字节） */
export const BROWSER_UPLOAD_MAX_BYTES =
  (parseEnvInt(
    process.env.BROWSER_UPLOAD_MAX_MB,
    LIMITS.UPLOAD_MAX_MB.min,
    LIMITS.UPLOAD_MAX_MB.max,
  ) ?? 10) *
  1024 *
  1024;

/** Streaming 是否使用 wss */
export const BROWSER_STREAM_SECURE =
  process.env.BROWSER_STREAM_SECURE === 'true';

/** Streaming 每个 Session 最大连接数 */
export const BROWSER_STREAM_MAX_CLIENTS =
  parseEnvInt(
    process.env.BROWSER_STREAM_MAX_CLIENTS,
    LIMITS.STREAM_MAX_CLIENTS.min,
    LIMITS.STREAM_MAX_CLIENTS.max,
  ) ?? 1;
