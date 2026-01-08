/**
 * 日志适配器
 * 提供统一的日志接口
 */

import type { Logger } from '@aiget/agents-adapter';

const LOG_PREFIX = '[MobileAdapter]';

/**
 * 默认日志实现
 */
export const logger: Logger = {
  debug: (...args: unknown[]) => console.debug(LOG_PREFIX, ...args),
  info: (...args: unknown[]) => console.info(LOG_PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(LOG_PREFIX, ...args),
  error: (...args: unknown[]) => console.error(LOG_PREFIX, ...args),
};

/**
 * 创建带前缀的日志实例
 */
export function createLogger(prefix: string = LOG_PREFIX): Logger {
  return {
    debug: (...args: unknown[]) => console.debug(prefix, ...args),
    info: (...args: unknown[]) => console.info(prefix, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
  };
}
