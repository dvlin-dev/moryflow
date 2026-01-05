/**
 * Playground 类型定义
 * 截图 API 请求/响应类型
 */

/** 设备预设 */
export type DevicePreset = 'desktop' | 'tablet' | 'mobile'

/** 图片格式 */
export type ImageFormat = 'png' | 'jpeg' | 'webp'

/** 响应类型 */
export type ResponseType = 'url' | 'base64'

/** 渲染模式 */
export type RenderMode = 'fast' | 'complete'

/** 截图请求参数 */
export interface ScreenshotRequest {
  /** 目标 URL */
  url: string
  /** 视口宽度 */
  width?: number
  /** 视口高度 */
  height?: number
  /** 全页面截图 */
  fullPage?: boolean
  /** 设备预设 */
  device?: DevicePreset
  /** 输出格式 */
  format?: ImageFormat
  /** 图片质量 (1-100) */
  quality?: number
  /** 额外等待时间 (ms) */
  delay?: number
  /** 等待指定选择器出现 */
  waitFor?: string
  /** 仅截取指定选择器元素 */
  clip?: string
  /** 隐藏指定选择器元素 */
  hide?: string[]
  /** 强制深色模式 */
  darkMode?: boolean
  /** 渲染模式 */
  renderMode?: RenderMode
  /** 自定义 User-Agent */
  userAgent?: string
  /** 截图前执行的脚本 */
  scripts?: string
  /** 响应类型 */
  response?: ResponseType
  /** 同步等待模式 */
  sync?: boolean
  /** 同步等待超时 (ms) */
  timeout?: number
  /** 是否返回详细时间统计 */
  includeTimings?: boolean
}

/** 页面元信息 */
export interface PageMeta {
  title?: string
  description?: string
  favicon?: string
}

/** 时间统计 */
export interface ScreenshotTimings {
  /** 队列等待时间 */
  queueWaitMs?: number
  /** 页面加载时间 */
  pageLoadMs?: number
  /** 截图捕获时间 */
  captureMs?: number
  /** 图片处理时间 */
  imageProcessMs?: number
  /** 文件上传时间 */
  uploadMs?: number
  /** 总处理时间 */
  totalMs: number
}

/** 截图数据 */
export interface ScreenshotData {
  /** 截图 ID */
  id: string
  /** 截图 URL（CDN 地址或 base64） */
  url: string
  /** 图片宽度 */
  width: number
  /** 图片高度 */
  height: number
  /** 图片格式 */
  format: string
  /** 文件大小 (bytes) */
  fileSize: number
  /** 是否来自缓存 */
  fromCache: boolean
  /** 处理耗时 (ms) */
  processingMs: number
  /** 页面元信息 */
  meta?: PageMeta
  /** 时间统计 */
  timings?: ScreenshotTimings
}

/** 截图成功响应 */
export interface ScreenshotSuccessResponse {
  success: true
  data: ScreenshotData
}

/** 截图错误响应 */
export interface ScreenshotErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

/** 截图响应（联合类型） */
export type ScreenshotResponse = ScreenshotSuccessResponse | ScreenshotErrorResponse
