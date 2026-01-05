// ============ 请求参数 ============

export interface ScreenshotRequest {
  // 必填
  url: string;

  // 视口尺寸
  width?: number;           // 默认 1280，最大由套餐决定
  height?: number;          // 默认 800
  fullPage?: boolean;       // 全页面截图，默认 false
  device?: DevicePreset;    // 预设设备，覆盖 width/height

  // 输出格式
  format?: 'png' | 'jpeg' | 'webp';  // 默认 png
  quality?: number;         // 1-100，仅 jpeg/webp 有效，默认 80

  // 渲染控制
  delay?: number;           // 页面加载后额外等待 ms，最大 10000
  waitFor?: string;         // 等待指定选择器出现
  clip?: string;            // 仅截取指定选择器元素
  hide?: string[];          // 隐藏指定选择器元素

  // 浏览器设置
  darkMode?: boolean;       // 强制深色模式
  userAgent?: string;       // 自定义 UA

  // 高级功能（需要付费套餐）
  scripts?: string;         // 截图前执行的 JS

  // 响应控制
  response?: 'url' | 'base64';  // 默认 url
  sync?: boolean;           // 同步等待，默认 true
  timeout?: number;         // 同步等待超时 ms，默认 30000，最大 60000
}

export type DevicePreset = 'desktop' | 'tablet' | 'mobile';

// ============ 响应结果 ============

export interface ScreenshotResponse {
  success: boolean;

  data?: {
    id: string;
    url: string;              // CDN URL 或 base64
    width: number;
    height: number;
    format: string;
    fileSize: number;
    fromCache: boolean;
    processingMs: number;
    meta?: {
      title?: string;
      description?: string;
      favicon?: string;
    };
  };

  error?: {
    code: ScreenshotErrorCode;
    message: string;
  };
}

// ============ 错误码 ============

export const ScreenshotErrorCode = {
  // 客户端错误
  INVALID_URL: 'INVALID_URL',
  INVALID_PARAMS: 'INVALID_PARAMS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  RATE_LIMITED: 'RATE_LIMITED',
  CONCURRENT_LIMIT_EXCEEDED: 'CONCURRENT_LIMIT_EXCEEDED',
  FEATURE_NOT_ALLOWED: 'FEATURE_NOT_ALLOWED',
  URL_NOT_ALLOWED: 'URL_NOT_ALLOWED',

  // 截图错误
  PAGE_LOAD_FAILED: 'PAGE_LOAD_FAILED',
  PAGE_TIMEOUT: 'PAGE_TIMEOUT',
  SELECTOR_NOT_FOUND: 'SELECTOR_NOT_FOUND',

  // 服务端错误
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ScreenshotErrorCode = (typeof ScreenshotErrorCode)[keyof typeof ScreenshotErrorCode];

// ============ 截图状态 ============

export const ScreenshotStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type ScreenshotStatus = (typeof ScreenshotStatus)[keyof typeof ScreenshotStatus];
