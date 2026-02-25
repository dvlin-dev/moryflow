/**
 * [PROVIDES]: createScalarMiddleware
 * [DEPENDS]: @scalar/nestjs-api-reference
 * [POS]: Scalar UI 中间件工厂
 */

import { apiReference } from '@scalar/nestjs-api-reference';

/**
 * 创建 Scalar API 文档中间件
 * @param jsonPath OpenAPI JSON 路径
 */
export function createScalarMiddleware(jsonPath: string) {
  return apiReference({
    spec: { url: jsonPath },
    theme: 'kepler',
    layout: 'modern',
    darkMode: true,
  });
}
