/**
 * 加密工具适配器
 * 基于 expo-crypto 提供加密功能
 */

import {
  randomUUID as expoRandomUUID,
  digestStringAsync,
  CryptoDigestAlgorithm,
  CryptoEncoding,
} from 'expo-crypto'
import type { CryptoUtils } from '@anyhunt/agents-adapter'

/**
 * 计算字符串的 SHA256 哈希
 */
async function sha256(input: string | Uint8Array): Promise<string> {
  const str = typeof input === 'string' ? input : new TextDecoder().decode(input)
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, str, {
    encoding: CryptoEncoding.HEX,
  })
}

/**
 * 生成 UUID
 */
function randomUUID(): string {
  return expoRandomUUID()
}

/**
 * 加密工具实例
 */
export const cryptoUtils: CryptoUtils = {
  sha256,
  randomUUID,
}

/**
 * 创建加密工具实例
 */
export function createCrypto(): CryptoUtils {
  return cryptoUtils
}
