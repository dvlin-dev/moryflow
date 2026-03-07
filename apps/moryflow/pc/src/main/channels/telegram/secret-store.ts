/**
 * [PROVIDES]: Telegram Bot Token/Webhook Secret 安全存储（keytar）
 * [DEPENDS]: keytar
 * [POS]: Telegram 敏感凭据存储边界（仅主进程）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

type KeytarApi = {
  getPassword: (service: string, account: string) => Promise<string | null>;
  setPassword: (service: string, account: string, password: string) => Promise<void>;
  deletePassword: (service: string, account: string) => Promise<boolean>;
};

const KEYTAR_SERVICE = 'moryflow.telegram.channel';

const botTokenKey = (accountId: string): string => `botToken:${accountId}`;
const webhookSecretKey = (accountId: string): string => `webhookSecret:${accountId}`;
const proxyUrlKey = (accountId: string): string => `proxyUrl:${accountId}`;

let keytarPromise: Promise<KeytarApi | null> | null = null;

const loadKeytar = async (): Promise<KeytarApi | null> => {
  if (!keytarPromise) {
    keytarPromise = import('keytar')
      .then((mod) => (mod?.default ?? mod) as KeytarApi)
      .catch((error) => {
        console.warn('[telegram-secret-store] keytar not available', error);
        return null;
      });
  }
  return keytarPromise;
};

const withKeytarRead = async <T>(
  handler: (keytar: KeytarApi) => Promise<T>,
  fallback: T
): Promise<T> => {
  const keytar = await loadKeytar();
  if (!keytar) {
    return fallback;
  }
  try {
    return await handler(keytar);
  } catch (error) {
    console.error('[telegram-secret-store] keytar operation failed', error);
    return fallback;
  }
};

const requireKeytar = async (): Promise<KeytarApi> => {
  const keytar = await loadKeytar();
  if (!keytar) {
    throw new Error('Secure credential storage is unavailable.');
  }
  return keytar;
};

const withKeytarWrite = async <T>(handler: (keytar: KeytarApi) => Promise<T>): Promise<T> => {
  const keytar = await requireKeytar();
  try {
    return await handler(keytar);
  } catch (error) {
    console.error('[telegram-secret-store] keytar operation failed', error);
    throw new Error(
      error instanceof Error
        ? `Secure credential storage failed: ${error.message}`
        : 'Secure credential storage failed.'
    );
  }
};

export const isTelegramSecretStorageAvailable = async (): Promise<boolean> => {
  return Boolean(await loadKeytar());
};

export const getTelegramBotToken = async (accountId: string): Promise<string | null> => {
  return withKeytarRead(
    (keytar) => keytar.getPassword(KEYTAR_SERVICE, botTokenKey(accountId)),
    null
  );
};

export const setTelegramBotToken = async (accountId: string, token: string): Promise<void> => {
  await withKeytarWrite((keytar) =>
    keytar.setPassword(KEYTAR_SERVICE, botTokenKey(accountId), token)
  );
};

export const clearTelegramBotToken = async (accountId: string): Promise<void> => {
  await withKeytarWrite((keytar) => keytar.deletePassword(KEYTAR_SERVICE, botTokenKey(accountId)));
};

export const getTelegramWebhookSecret = async (accountId: string): Promise<string | null> => {
  return withKeytarRead(
    (keytar) => keytar.getPassword(KEYTAR_SERVICE, webhookSecretKey(accountId)),
    null
  );
};

export const setTelegramWebhookSecret = async (
  accountId: string,
  secret: string
): Promise<void> => {
  await withKeytarWrite((keytar) =>
    keytar.setPassword(KEYTAR_SERVICE, webhookSecretKey(accountId), secret)
  );
};

export const clearTelegramWebhookSecret = async (accountId: string): Promise<void> => {
  await withKeytarWrite((keytar) =>
    keytar.deletePassword(KEYTAR_SERVICE, webhookSecretKey(accountId))
  );
};

export const getTelegramProxyUrl = async (accountId: string): Promise<string | null> => {
  return withKeytarRead(
    (keytar) => keytar.getPassword(KEYTAR_SERVICE, proxyUrlKey(accountId)),
    null
  );
};

export const setTelegramProxyUrl = async (accountId: string, proxyUrl: string): Promise<void> => {
  await withKeytarWrite((keytar) =>
    keytar.setPassword(KEYTAR_SERVICE, proxyUrlKey(accountId), proxyUrl)
  );
};

export const clearTelegramProxyUrl = async (accountId: string): Promise<void> => {
  await withKeytarWrite((keytar) => keytar.deletePassword(KEYTAR_SERVICE, proxyUrlKey(accountId)));
};
