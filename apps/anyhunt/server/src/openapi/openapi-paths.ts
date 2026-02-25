/**
 * [PROVIDES]: isOpenApiRoutePath
 * [DEPENDS]: SCALAR_CONFIG
 * [POS]: OpenAPI 路径匹配工具，用于放行文档请求
 */

import { SCALAR_CONFIG } from './openapi.constants';

/**
 * 判断请求路径是否属于 OpenAPI/Scalar 文档路径
 */
export function isOpenApiRoutePath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === SCALAR_CONFIG.OPENAPI_JSON_PATH) {
    return true;
  }
  if (normalized === SCALAR_CONFIG.INTERNAL_OPENAPI_JSON_PATH) {
    return true;
  }
  if (normalized === SCALAR_CONFIG.PUBLIC_DOCS_PATH) {
    return true;
  }
  if (normalized === SCALAR_CONFIG.INTERNAL_DOCS_PATH) {
    return true;
  }
  return normalized.startsWith(`${SCALAR_CONFIG.PUBLIC_DOCS_PATH}/`);
}
