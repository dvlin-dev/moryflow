/**
 * [PROVIDES]: encrypt, decrypt - 密码加密/解密工具
 * [DEPENDS]: crypto, PRE_REGISTER_ENCRYPTION_KEY 环境变量
 * [POS]: 预注册模块密码加密，确保 Redis 中存储的密码安全
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * 获取加密密钥
 * 延迟获取以确保环境变量已加载
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.PRE_REGISTER_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'PRE_REGISTER_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
    );
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * 加密文本
 * @param text 明文
 * @returns 格式: iv:authTag:encrypted (hex 编码)
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * 解密文本
 * @param encryptedText 格式: iv:authTag:encrypted (hex 编码)
 * @returns 明文
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
