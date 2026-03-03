/**
 * [PROVIDES]: Telegram 渠道非敏感配置持久化（electron-store）
 * [DEPENDS]: electron-store, ./types
 * [POS]: Telegram 主进程配置事实源（token/webhook secret 不落盘）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import Store from 'electron-store';
import type {
  TelegramAccountSettings,
  TelegramSettingsStore,
  TelegramSettingsUpdateInput,
} from './types.js';

const DEFAULT_ACCOUNT_ID = 'default';

const DEFAULT_ACCOUNT_SETTINGS: TelegramAccountSettings = {
  accountId: DEFAULT_ACCOUNT_ID,
  enabled: false,
  mode: 'polling',
  webhookUrl: '',
  webhookListenHost: '127.0.0.1',
  webhookListenPort: 8787,
  dmPolicy: 'pairing',
  allowFrom: [],
  groupPolicy: 'allowlist',
  groupAllowFrom: [],
  requireMentionByDefault: true,
  groups: {},
  pollingTimeoutSeconds: 25,
  pollingIdleDelayMs: 600,
  pollingMaxBatchSize: 100,
  pairingCodeTtlSeconds: 900,
  maxSendRetries: 3,
};

const DEFAULT_STORE: TelegramSettingsStore = {
  defaultAccountId: DEFAULT_ACCOUNT_ID,
  accounts: {
    [DEFAULT_ACCOUNT_ID]: DEFAULT_ACCOUNT_SETTINGS,
  },
};

const telegramSettingsStore = new Store<TelegramSettingsStore>({
  name: 'telegram-channel-settings',
  defaults: DEFAULT_STORE,
});

const sanitizeStringList = (input: string[] | undefined): string[] => {
  if (!Array.isArray(input)) {
    return [];
  }
  return Array.from(
    new Set(input.map((value) => value.trim()).filter((value) => value.length > 0))
  );
};

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(Math.trunc(value), min), max);
};

const sanitizeAccountPatch = (
  patch?: Partial<TelegramAccountSettings>
): Partial<TelegramAccountSettings> => {
  if (!patch) {
    return {};
  }

  return {
    enabled: patch.enabled,
    mode: patch.mode,
    webhookUrl: patch.webhookUrl,
    webhookListenHost: patch.webhookListenHost,
    webhookListenPort: patch.webhookListenPort,
    dmPolicy: patch.dmPolicy,
    allowFrom: patch.allowFrom,
    groupPolicy: patch.groupPolicy,
    groupAllowFrom: patch.groupAllowFrom,
    requireMentionByDefault: patch.requireMentionByDefault,
    groups: patch.groups,
    pollingTimeoutSeconds: patch.pollingTimeoutSeconds,
    pollingIdleDelayMs: patch.pollingIdleDelayMs,
    pollingMaxBatchSize: patch.pollingMaxBatchSize,
    pairingCodeTtlSeconds: patch.pairingCodeTtlSeconds,
    maxSendRetries: patch.maxSendRetries,
  };
};

const normalizeAccount = (
  accountId: string,
  current: TelegramAccountSettings,
  patch?: Partial<TelegramAccountSettings>
): TelegramAccountSettings => {
  const safePatch = sanitizeAccountPatch(patch);
  const merged: TelegramAccountSettings = {
    ...current,
    ...safePatch,
    accountId,
  };

  return {
    ...merged,
    accountId,
    webhookUrl: (merged.webhookUrl ?? '').trim(),
    webhookListenHost: (merged.webhookListenHost ?? '127.0.0.1').trim() || '127.0.0.1',
    webhookListenPort: clamp(merged.webhookListenPort, 1, 65_535),
    allowFrom: sanitizeStringList(merged.allowFrom),
    groupAllowFrom: sanitizeStringList(merged.groupAllowFrom),
    pollingTimeoutSeconds: clamp(merged.pollingTimeoutSeconds, 5, 60),
    pollingIdleDelayMs: clamp(merged.pollingIdleDelayMs, 100, 5_000),
    pollingMaxBatchSize: clamp(merged.pollingMaxBatchSize, 1, 100),
    pairingCodeTtlSeconds: clamp(merged.pairingCodeTtlSeconds, 60, 86_400),
    maxSendRetries: clamp(merged.maxSendRetries, 1, 8),
    groups: merged.groups ?? {},
  };
};

const normalizeStore = (input: TelegramSettingsStore): TelegramSettingsStore => {
  const nextAccounts: Record<string, TelegramAccountSettings> = {};

  for (const [accountId, account] of Object.entries(input.accounts ?? {})) {
    const normalizedId = accountId.trim();
    if (!normalizedId) {
      continue;
    }
    nextAccounts[normalizedId] = normalizeAccount(
      normalizedId,
      DEFAULT_ACCOUNT_SETTINGS,
      account as Partial<TelegramAccountSettings>
    );
  }

  if (!nextAccounts[DEFAULT_ACCOUNT_ID]) {
    nextAccounts[DEFAULT_ACCOUNT_ID] = DEFAULT_ACCOUNT_SETTINGS;
  }

  const defaultAccountId = input.defaultAccountId?.trim() || DEFAULT_ACCOUNT_ID;
  return {
    defaultAccountId: nextAccounts[defaultAccountId] ? defaultAccountId : DEFAULT_ACCOUNT_ID,
    accounts: nextAccounts,
  };
};

export const getTelegramSettingsStore = (): TelegramSettingsStore => {
  return normalizeStore(telegramSettingsStore.store);
};

export const updateTelegramSettingsStore = (
  input: TelegramSettingsUpdateInput
): TelegramSettingsStore => {
  const current = getTelegramSettingsStore();
  const accountId = input.account.accountId.trim();
  if (!accountId) {
    throw new Error('accountId is required');
  }

  const currentAccount = current.accounts[accountId] ?? {
    ...DEFAULT_ACCOUNT_SETTINGS,
    accountId,
  };

  const nextAccount = normalizeAccount(accountId, currentAccount, input.account);
  const nextStore = normalizeStore({
    defaultAccountId: input.defaultAccountId ?? current.defaultAccountId,
    accounts: {
      ...current.accounts,
      [accountId]: nextAccount,
    },
  });

  telegramSettingsStore.store = nextStore;
  return nextStore;
};
