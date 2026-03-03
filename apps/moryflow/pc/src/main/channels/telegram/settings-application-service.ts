/**
 * [INPUT]: Telegram settings 更新请求 + secret storage
 * [OUTPUT]: Telegram settings snapshot（含 runtime 同步）
 * [POS]: Telegram settings application service（配置/凭据应用边界）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  clearTelegramBotToken,
  clearTelegramWebhookSecret,
  getTelegramBotToken,
  getTelegramWebhookSecret,
  isTelegramSecretStorageAvailable,
  setTelegramBotToken,
  setTelegramWebhookSecret,
} from './secret-store.js';
import { getTelegramSettingsStore, updateTelegramSettingsStore } from './settings-store.js';
import type {
  TelegramAccountSettings,
  TelegramSettingsSnapshot,
  TelegramSettingsUpdateInput,
} from './types.js';

type RuntimeSync = {
  applyAccounts: (accounts: Record<string, TelegramAccountSettings>) => Promise<void>;
};

const buildSettingsSnapshot = async (): Promise<TelegramSettingsSnapshot> => {
  const store = getTelegramSettingsStore();

  const entries = await Promise.all(
    Object.entries(store.accounts).map(async ([accountId, account]) => {
      const hasBotToken = Boolean(await getTelegramBotToken(accountId));
      const hasWebhookSecret = Boolean(await getTelegramWebhookSecret(accountId));
      return [
        accountId,
        {
          ...account,
          hasBotToken,
          hasWebhookSecret,
        },
      ] as const;
    })
  );

  return {
    defaultAccountId: store.defaultAccountId,
    accounts: Object.fromEntries(entries),
  };
};

export type TelegramSettingsApplicationService = {
  isSecretStorageAvailable: () => Promise<boolean>;
  getSettings: () => Promise<TelegramSettingsSnapshot>;
  updateSettings: (input: TelegramSettingsUpdateInput) => Promise<TelegramSettingsSnapshot>;
};

export const createTelegramSettingsApplicationService = (input: {
  runtimeSync: RuntimeSync;
}): TelegramSettingsApplicationService => {
  return {
    isSecretStorageAvailable: async () => {
      return isTelegramSecretStorageAvailable();
    },
    getSettings: async () => {
      return buildSettingsSnapshot();
    },
    updateSettings: async (payload) => {
      const accountId = payload.account.accountId.trim();
      if (!accountId) {
        throw new Error('accountId is required');
      }
      const normalizedPayload: TelegramSettingsUpdateInput = {
        ...payload,
        account: {
          ...payload.account,
          accountId,
        },
      };

      if (typeof normalizedPayload.account.botToken === 'string') {
        const token = normalizedPayload.account.botToken.trim();
        if (token) {
          await setTelegramBotToken(accountId, token);
        }
      } else if (normalizedPayload.account.botToken === null) {
        await clearTelegramBotToken(accountId);
      }

      if (typeof normalizedPayload.account.webhookSecret === 'string') {
        const secret = normalizedPayload.account.webhookSecret.trim();
        if (secret) {
          await setTelegramWebhookSecret(accountId, secret);
        }
      } else if (normalizedPayload.account.webhookSecret === null) {
        await clearTelegramWebhookSecret(accountId);
      }

      const nextStore = updateTelegramSettingsStore(normalizedPayload);
      await input.runtimeSync.applyAccounts(nextStore.accounts);
      return buildSettingsSnapshot();
    },
  };
};
