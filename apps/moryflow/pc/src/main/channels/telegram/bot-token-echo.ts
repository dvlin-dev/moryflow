/**
 * [PROVIDES]: Telegram Bot Token 传输回显密文（主进程可解密，renderer 不可解）
 * [DEPENDS]: node:crypto
 * [POS]: Telegram settings snapshot 密钥边界（避免明文 token 进入 renderer）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const BOT_TOKEN_ECHO_PREFIX = 'mftg:v1:';
const BOT_TOKEN_ECHO_ALGO = 'aes-256-gcm';
const BOT_TOKEN_ECHO_KEY_BYTES = 32;
const BOT_TOKEN_ECHO_IV_BYTES = 12;
const BOT_TOKEN_ECHO_TAG_BYTES = 16;
const BOT_TOKEN_ECHO_MIN_PAYLOAD_BYTES = BOT_TOKEN_ECHO_IV_BYTES + BOT_TOKEN_ECHO_TAG_BYTES + 1;

const botTokenEchoKey = randomBytes(BOT_TOKEN_ECHO_KEY_BYTES);

type BotTokenEchoPayload = {
  accountId: string;
  token: string;
};

const decodePayload = (raw: string): BotTokenEchoPayload | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<BotTokenEchoPayload>;
    if (typeof parsed.accountId !== 'string' || typeof parsed.token !== 'string') {
      return null;
    }
    if (!parsed.accountId || !parsed.token) {
      return null;
    }
    return {
      accountId: parsed.accountId,
      token: parsed.token,
    };
  } catch {
    return null;
  }
};

export const createTelegramBotTokenEcho = (input: { accountId: string; token: string }): string => {
  const iv = randomBytes(BOT_TOKEN_ECHO_IV_BYTES);
  const cipher = createCipheriv(BOT_TOKEN_ECHO_ALGO, botTokenEchoKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify({ accountId: input.accountId, token: input.token }), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]).toString('base64url');
  return `${BOT_TOKEN_ECHO_PREFIX}${payload}`;
};

export const parseTelegramBotTokenEcho = (input: {
  accountId: string;
  value: string;
}): string | null => {
  if (!input.value.startsWith(BOT_TOKEN_ECHO_PREFIX)) {
    return null;
  }
  const encoded = input.value.slice(BOT_TOKEN_ECHO_PREFIX.length);
  if (!encoded) {
    return null;
  }

  let payload: Buffer;
  try {
    payload = Buffer.from(encoded, 'base64url');
  } catch {
    return null;
  }
  if (payload.length < BOT_TOKEN_ECHO_MIN_PAYLOAD_BYTES) {
    return null;
  }

  const iv = payload.subarray(0, BOT_TOKEN_ECHO_IV_BYTES);
  const tag = payload.subarray(
    BOT_TOKEN_ECHO_IV_BYTES,
    BOT_TOKEN_ECHO_IV_BYTES + BOT_TOKEN_ECHO_TAG_BYTES
  );
  const encrypted = payload.subarray(BOT_TOKEN_ECHO_IV_BYTES + BOT_TOKEN_ECHO_TAG_BYTES);

  try {
    const decipher = createDecipheriv(BOT_TOKEN_ECHO_ALGO, botTokenEchoKey, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
      'utf8'
    );
    const parsed = decodePayload(decrypted);
    if (!parsed) {
      return null;
    }
    if (parsed.accountId !== input.accountId) {
      return null;
    }
    return parsed.token;
  } catch {
    return null;
  }
};
