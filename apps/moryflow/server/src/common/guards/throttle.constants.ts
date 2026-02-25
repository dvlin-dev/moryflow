/**
 * [DEFINES]: 全局限流配置注入 token
 * [USED_BY]: throttle.module.ts, app.module.ts
 * [POS]: 限流配置依赖注入常量
 */

export const GLOBAL_THROTTLE_CONFIG = Symbol('GLOBAL_THROTTLE_CONFIG');
