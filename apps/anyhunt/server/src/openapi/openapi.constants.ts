/**
 * [DEFINES]: Scalar 和 OpenAPI 路径常量
 * [USED_BY]: main.ts, openapi.service.ts
 * [POS]: OpenAPI 配置模块
 */

export const SCALAR_CONFIG = {
  /** 公开 API OpenAPI JSON 路径 */
  OPENAPI_JSON_PATH: '/openapi.json',
  /** 公开 API 文档路径 */
  PUBLIC_DOCS_PATH: '/api-reference',
  /** 内部 API OpenAPI JSON 路径 */
  INTERNAL_OPENAPI_JSON_PATH: '/openapi-internal.json',
  /** 内部 API 文档路径 */
  INTERNAL_DOCS_PATH: '/api-reference/internal',
} as const;
