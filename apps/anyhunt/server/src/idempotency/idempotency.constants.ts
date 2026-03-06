/**
 * [DEFINES]: 幂等默认 TTL 与请求头常量
 * [USED_BY]: idempotency decorators/executor/controllers
 */

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';
export const DEFAULT_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;
