/**
 * [INPUT]: Telegram settings 更新请求 + secret storage
 * [OUTPUT]: Telegram settings snapshot（含 runtime 同步）
 * [POS]: Telegram settings application service（配置/凭据应用边界）
 * [UPDATE]: 2026-03-04 - getSettings snapshot 回填 botToken/proxyUrl，支持重启后 UI 自动显示已存凭据
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  clearTelegramBotToken,
  clearTelegramProxyUrl,
  clearTelegramWebhookSecret,
  getTelegramBotToken,
  getTelegramProxyUrl,
  getTelegramWebhookSecret,
  isTelegramSecretStorageAvailable,
  setTelegramBotToken,
  setTelegramProxyUrl,
  setTelegramWebhookSecret,
} from './secret-store.js';
import fetch from 'node-fetch';
import { ProxyAgent } from 'proxy-agent';
import { getTelegramSettingsStore, updateTelegramSettingsStore } from './settings-store.js';
import type {
  TelegramAccountSettings,
  TelegramProxyTestInput,
  TelegramProxyTestResult,
  TelegramSettingsSnapshot,
  TelegramSettingsUpdateInput,
} from './types.js';

type RuntimeSync = {
  applyAccounts: (accounts: Record<string, TelegramAccountSettings>) => Promise<void>;
};

const TELEGRAM_API_HEALTHCHECK_URL = 'https://api.telegram.org';
const TELEGRAM_PROXY_TEST_TIMEOUT_MS = 8_000;
const ALLOWED_PROXY_PROTOCOLS = new Set(['http:', 'https:', 'socks5:']);

type ProxyAgentLike = {
  destroy?: () => void;
};

const normalizeProxyUrl = (value: string): string => value.trim();

const ensureValidProxyUrl = (proxyUrl: string): void => {
  let parsed: URL;
  try {
    parsed = new URL(proxyUrl);
  } catch {
    throw new Error('Proxy URL must be a valid URL.');
  }

  if (!ALLOWED_PROXY_PROTOCOLS.has(parsed.protocol)) {
    throw new Error('Proxy URL protocol must be http, https, or socks5.');
  }
};

const toProxyTestErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return `Proxy connection failed: ${message}`;
};

const destroyProxyAgent = (agent: ProxyAgentLike | null): void => {
  if (!agent) {
    return;
  }
  try {
    agent.destroy?.();
  } catch (error) {
    console.warn('[telegram-channel] failed to destroy proxy agent', error);
  }
};

const buildSettingsSnapshot = async (): Promise<TelegramSettingsSnapshot> => {
  const store = getTelegramSettingsStore();

  const entries = await Promise.all(
    Object.entries(store.accounts).map(async ([accountId, account]) => {
      const botToken = await getTelegramBotToken(accountId);
      const hasWebhookSecret = Boolean(await getTelegramWebhookSecret(accountId));
      const proxyUrl = await getTelegramProxyUrl(accountId);
      return [
        accountId,
        {
          ...account,
          hasBotToken: Boolean(botToken),
          hasWebhookSecret,
          hasProxyUrl: Boolean(proxyUrl),
          botToken: botToken ?? undefined,
          proxyUrl: proxyUrl ?? undefined,
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
  testProxyConnection: (input: TelegramProxyTestInput) => Promise<TelegramProxyTestResult>;
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

      if (typeof normalizedPayload.account.proxyUrl === 'string') {
        const proxyUrl = normalizeProxyUrl(normalizedPayload.account.proxyUrl);
        if (proxyUrl) {
          ensureValidProxyUrl(proxyUrl);
          await setTelegramProxyUrl(accountId, proxyUrl);
        }
      } else if (normalizedPayload.account.proxyUrl === null) {
        await clearTelegramProxyUrl(accountId);
      }

      const nextStore = updateTelegramSettingsStore(normalizedPayload);
      await input.runtimeSync.applyAccounts(nextStore.accounts);
      return buildSettingsSnapshot();
    },
    testProxyConnection: async (payload) => {
      const accountId = payload.accountId.trim();
      if (!accountId) {
        throw new Error('accountId is required');
      }

      const store = getTelegramSettingsStore();
      const account = store.accounts[accountId];
      const proxyEnabled = payload.proxyEnabled ?? account?.proxyEnabled ?? false;
      if (!proxyEnabled) {
        return {
          ok: false,
          message: 'Proxy is disabled for this account.',
          elapsedMs: 0,
        };
      }

      const proxyUrlFromInput = payload.proxyUrl ? normalizeProxyUrl(payload.proxyUrl) : '';
      const proxyUrl = proxyUrlFromInput || (await getTelegramProxyUrl(accountId)) || '';
      if (!proxyUrl) {
        return {
          ok: false,
          message: 'Proxy URL is required when proxy is enabled.',
          elapsedMs: 0,
        };
      }

      try {
        ensureValidProxyUrl(proxyUrl);
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
          elapsedMs: 0,
        };
      }

      const startedAt = Date.now();
      let proxyAgent: ProxyAgentLike | null = null;
      try {
        proxyAgent = new ProxyAgent({
          getProxyForUrl: () => proxyUrl,
        }) as ProxyAgentLike;
        const response = await fetch(TELEGRAM_API_HEALTHCHECK_URL, {
          method: 'GET',
          agent: proxyAgent as any,
          signal: AbortSignal.timeout(TELEGRAM_PROXY_TEST_TIMEOUT_MS) as any,
        });
        const elapsedMs = Date.now() - startedAt;
        if (!response.ok) {
          return {
            ok: false,
            message: `Telegram API responded with status ${response.status}.`,
            statusCode: response.status,
            elapsedMs,
          };
        }
        return {
          ok: true,
          message: 'Proxy connection to Telegram API succeeded.',
          statusCode: response.status,
          elapsedMs,
        };
      } catch (error) {
        return {
          ok: false,
          message: toProxyTestErrorMessage(error),
          elapsedMs: Date.now() - startedAt,
        };
      } finally {
        destroyProxyAgent(proxyAgent);
      }
    },
  };
};
