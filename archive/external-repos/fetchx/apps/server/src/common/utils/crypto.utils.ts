/**
 * Crypto Utilities
 * 加密相关工具函数
 */

import { randomBytes } from 'crypto';

/**
 * 生成安全的随机令牌
 * 使用 crypto.randomBytes 生成密码学安全的随机字符串
 *
 * @param length - 字节长度（输出字符串长度为 length * 2）
 * @returns 十六进制格式的随机字符串
 */
export function generateSecureToken(length = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * 生成安全的随机 ID
 * 使用 URL-safe 的 base64 编码
 *
 * @param length - 字节长度
 * @returns base64url 格式的随机字符串
 */
export function generateSecureId(length = 21): string {
  return randomBytes(length).toString('base64url');
}
