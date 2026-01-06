/**
 * Query 工具函数
 *
 * [PROVIDES]: buildQueryString
 * [DEPENDS]: 无
 * [POS]: 通用查询字符串构建工具
 */

/**
 * 构建 URL 查询字符串
 * @param params - 参数对象，undefined 值会被忽略
 * @returns 查询字符串（不含 ?）
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      urlParams.set(key, String(value));
    }
  }
  return urlParams.toString();
}

/**
 * 构建带查询参数的 URL
 * @param baseUrl - 基础 URL
 * @param params - 参数对象
 * @returns 完整的 URL（包含查询参数）
 */
export function buildUrl(
  baseUrl: string,
  params: Record<string, string | number | boolean | undefined>,
): string {
  const qs = buildQueryString(params);
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}
