/**
 * [INPUT]: ANYHUNT_LLM_SECRET_KEY (base64 32 bytes), plaintext apiKey
 * [OUTPUT]: encrypted apiKey string (v1:...), decrypted apiKey plaintext
 * [POS]: Admin LLM provider 的密钥加解密边界（禁止明文入库）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { ANYHUNT_LLM_SECRET_KEY_ENV } from './llm.constants';

const ENCRYPTION_VERSION = 'v1';
const IV_BYTES = 12;
const KEY_BYTES = 32;

function decodeSecretKeyOrThrow(raw: string | undefined): Buffer {
  const value = raw?.trim();
  if (!value) {
    throw new Error(`${ANYHUNT_LLM_SECRET_KEY_ENV} must be set`);
  }

  const key = Buffer.from(value, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(`${ANYHUNT_LLM_SECRET_KEY_ENV} must be base64(32 bytes)`);
  }

  return key;
}

@Injectable()
export class LlmSecretService {
  encryptApiKey(plaintext: string): string {
    const key = decodeSecretKeyOrThrow(process.env[ANYHUNT_LLM_SECRET_KEY_ENV]);
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      ENCRYPTION_VERSION,
      iv.toString('base64'),
      ciphertext.toString('base64'),
      tag.toString('base64'),
    ].join(':');
  }

  decryptApiKey(encrypted: string): string {
    const key = decodeSecretKeyOrThrow(process.env[ANYHUNT_LLM_SECRET_KEY_ENV]);
    const parts = encrypted.split(':');
    if (parts.length !== 4 || parts[0] !== ENCRYPTION_VERSION) {
      throw new Error('Invalid encrypted apiKey payload');
    }

    const iv = Buffer.from(parts[1], 'base64');
    const ciphertext = Buffer.from(parts[2], 'base64');
    const tag = Buffer.from(parts[3], 'base64');

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  }
}
