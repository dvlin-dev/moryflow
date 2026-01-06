/**
 * Cloud Sync - 统一日志模块
 * 单一职责：提供统一的日志格式和级别控制
 */

/** 日志级别 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** 日志模块名称 */
export type LogModule =
  | 'sync-engine'
  | 'state'
  | 'activity'
  | 'scheduler'
  | 'executor'
  | 'file-index'
  | 'api'
  | 'store'
  | 'auto-binding'
  | 'user-info'
  | 'binding-conflict'

/** 格式化日志前缀 */
const formatPrefix = (module: LogModule): string => `[cloud-sync:${module}]`

/** 创建特定模块的日志器 */
export const createLogger = (module: LogModule) => ({
  debug: (msg: string, ...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatPrefix(module), msg, ...args)
    }
  },
  info: (msg: string, ...args: unknown[]): void => {
    console.info(formatPrefix(module), msg, ...args)
  },
  warn: (msg: string, ...args: unknown[]): void => {
    console.warn(formatPrefix(module), msg, ...args)
  },
  error: (msg: string, ...args: unknown[]): void => {
    console.error(formatPrefix(module), msg, ...args)
  },
})

/** 默认日志器（通用） */
export const logger = {
  debug: (msg: string, ...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[cloud-sync]', msg, ...args)
    }
  },
  info: (msg: string, ...args: unknown[]): void => {
    console.info('[cloud-sync]', msg, ...args)
  },
  warn: (msg: string, ...args: unknown[]): void => {
    console.warn('[cloud-sync]', msg, ...args)
  },
  error: (msg: string, ...args: unknown[]): void => {
    console.error('[cloud-sync]', msg, ...args)
  },
}
