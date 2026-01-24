/**
 * [PROVIDES]: 沙盒模块日志
 * [DEPENDS]: /agents-core
 * [POS]: 统一的日志接口，命名空间 openai-agents:sandbox
 */

import { getLogger } from '@openai/agents-core';

/** 日志类型（从 getLogger 返回类型推断） */
export type Logger = ReturnType<typeof getLogger>;

/** 沙盒模块日志实例 */
export const logger: Logger = getLogger('openai-agents:sandbox');

/** 子模块日志创建 */
export function createSubLogger(subNamespace: string): Logger {
  return getLogger(`openai-agents:sandbox:${subNamespace}`);
}
