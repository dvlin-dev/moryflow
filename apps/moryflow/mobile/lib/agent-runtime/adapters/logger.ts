/**
 * 日志适配器
 *
 * [PROVIDES]: logger, createLogger
 * [DEPENDS]: @aiget/agents-adapter
 * [POS]: Mobile Agent Runtime 日志出口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { Logger } from '@aiget/agents-adapter';

const LOG_PREFIX = '[MobileAdapter]';

/**
 * 默认日志实现
 */
export const logger: Logger = {
  debug: (...args: unknown[]) => {
    if (__DEV__) {
      console.warn(LOG_PREFIX, '[debug]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (__DEV__) {
      console.warn(LOG_PREFIX, '[info]', ...args);
    }
  },
  warn: (...args: unknown[]) => console.warn(LOG_PREFIX, ...args),
  error: (...args: unknown[]) => console.error(LOG_PREFIX, ...args),
};

/**
 * 创建带前缀的日志实例
 */
export function createLogger(prefix: string = LOG_PREFIX): Logger {
  return {
    debug: (...args: unknown[]) => {
      if (__DEV__) {
        console.warn(prefix, '[debug]', ...args);
      }
    },
    info: (...args: unknown[]) => {
      if (__DEV__) {
        console.warn(prefix, '[info]', ...args);
      }
    },
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
  };
}
