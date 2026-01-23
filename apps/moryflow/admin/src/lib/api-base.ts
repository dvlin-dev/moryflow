/**
 * [PROVIDES]: API_BASE_URL
 * [DEPENDS]: VITE_API_URL
 * [POS]: Admin 端 API 基础配置
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';
