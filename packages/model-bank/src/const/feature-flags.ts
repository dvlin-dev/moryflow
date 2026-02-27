/**
 * [INPUT]: 环境变量 `MODEL_BANK_ENABLE_BUSINESS_FEATURES`
 * [OUTPUT]: ENABLE_BUSINESS_FEATURES - 是否开启 business-only 模型与 provider
 * [POS]: model-bank 包内统一 feature flag，避免对外部 workspace 常量的硬依赖
 */
const MODEL_BANK_ENABLE_BUSINESS_FEATURES = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env?.MODEL_BANK_ENABLE_BUSINESS_FEATURES;

export const ENABLE_BUSINESS_FEATURES =
  MODEL_BANK_ENABLE_BUSINESS_FEATURES === '1' || MODEL_BANK_ENABLE_BUSINESS_FEATURES === 'true';
