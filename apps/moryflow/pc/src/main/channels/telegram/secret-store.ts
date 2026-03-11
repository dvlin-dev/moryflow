/**
 * [PROVIDES]: Telegram Bot Token/Webhook Secret 本地持久化（electron-store）
 * [DEPENDS]: ../store-factory
 * [POS]: Telegram 敏感凭据存储边界（仅主进程）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { createDesktopStore } from '../../store-factory.js';

const botTokenKey = (accountId: string): string => `botToken:${accountId}`;
const webhookSecretKey = (accountId: string): string => `webhookSecret:${accountId}`;
const proxyUrlKey = (accountId: string): string => `proxyUrl:${accountId}`;

type TelegramSecretStoreSchema = Record<string, string>;

const store = createDesktopStore<TelegramSecretStoreSchema>({
  name: 'telegram-channel-secrets',
});

const readSecret = async (key: string): Promise<string | null> => {
  try {
    const value = store.get(key);
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch (error) {
    console.error('[telegram-secret-store] local store read failed', error);
    return null;
  }
};

const writeSecret = async (key: string, value: string): Promise<void> => {
  try {
    store.set(key, value);
  } catch (error) {
    console.error('[telegram-secret-store] local store write failed', error);
    throw new Error(
      error instanceof Error
        ? `Local credential storage failed: ${error.message}`
        : 'Local credential storage failed.'
    );
  }
};

const deleteSecret = async (key: string): Promise<void> => {
  try {
    store.delete(key);
  } catch (error) {
    console.error('[telegram-secret-store] local store delete failed', error);
    throw new Error(
      error instanceof Error
        ? `Local credential storage failed: ${error.message}`
        : 'Local credential storage failed.'
    );
  }
};

export const isTelegramSecretStorageAvailable = async (): Promise<boolean> => {
  return true;
};

export const getTelegramBotToken = async (accountId: string): Promise<string | null> => {
  return readSecret(botTokenKey(accountId));
};

export const setTelegramBotToken = async (accountId: string, token: string): Promise<void> => {
  await writeSecret(botTokenKey(accountId), token);
};

export const clearTelegramBotToken = async (accountId: string): Promise<void> => {
  await deleteSecret(botTokenKey(accountId));
};

export const getTelegramWebhookSecret = async (accountId: string): Promise<string | null> => {
  return readSecret(webhookSecretKey(accountId));
};

export const setTelegramWebhookSecret = async (
  accountId: string,
  secret: string
): Promise<void> => {
  await writeSecret(webhookSecretKey(accountId), secret);
};

export const clearTelegramWebhookSecret = async (accountId: string): Promise<void> => {
  await deleteSecret(webhookSecretKey(accountId));
};

export const getTelegramProxyUrl = async (accountId: string): Promise<string | null> => {
  return readSecret(proxyUrlKey(accountId));
};

export const setTelegramProxyUrl = async (accountId: string, proxyUrl: string): Promise<void> => {
  await writeSecret(proxyUrlKey(accountId), proxyUrl);
};

export const clearTelegramProxyUrl = async (accountId: string): Promise<void> => {
  await deleteSecret(proxyUrlKey(accountId));
};
