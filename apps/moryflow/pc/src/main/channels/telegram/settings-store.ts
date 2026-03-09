/**
 * [PROVIDES]: Telegram 渠道非敏感配置持久化（electron-store）
 * [DEPENDS]: electron-store, ./types
 * [POS]: Telegram 主进程配置事实源（token/webhook secret 不落盘）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
  proxyEnabled: false,
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
  enableDraftStreaming: true,
  draftFlushIntervalMs: 350,
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

  const nextPatch: Partial<TelegramAccountSettings> = {};

  if (patch.enabled !== undefined) nextPatch.enabled = patch.enabled;
  if (patch.mode !== undefined) nextPatch.mode = patch.mode;
  if (patch.proxyEnabled !== undefined) nextPatch.proxyEnabled = patch.proxyEnabled;
  if (patch.webhookUrl !== undefined) nextPatch.webhookUrl = patch.webhookUrl;
  if (patch.webhookListenHost !== undefined) nextPatch.webhookListenHost = patch.webhookListenHost;
  if (patch.webhookListenPort !== undefined) nextPatch.webhookListenPort = patch.webhookListenPort;
  if (patch.dmPolicy !== undefined) nextPatch.dmPolicy = patch.dmPolicy;
  if (patch.allowFrom !== undefined) nextPatch.allowFrom = patch.allowFrom;
  if (patch.groupPolicy !== undefined) nextPatch.groupPolicy = patch.groupPolicy;
  if (patch.groupAllowFrom !== undefined) nextPatch.groupAllowFrom = patch.groupAllowFrom;
  if (patch.requireMentionByDefault !== undefined)
    nextPatch.requireMentionByDefault = patch.requireMentionByDefault;
  if (patch.groups !== undefined) nextPatch.groups = patch.groups;
  if (patch.pollingTimeoutSeconds !== undefined)
    nextPatch.pollingTimeoutSeconds = patch.pollingTimeoutSeconds;
  if (patch.pollingIdleDelayMs !== undefined)
    nextPatch.pollingIdleDelayMs = patch.pollingIdleDelayMs;
  if (patch.pollingMaxBatchSize !== undefined)
    nextPatch.pollingMaxBatchSize = patch.pollingMaxBatchSize;
  if (patch.pairingCodeTtlSeconds !== undefined)
    nextPatch.pairingCodeTtlSeconds = patch.pairingCodeTtlSeconds;
  if (patch.maxSendRetries !== undefined) nextPatch.maxSendRetries = patch.maxSendRetries;
  if (patch.enableDraftStreaming !== undefined)
    nextPatch.enableDraftStreaming = patch.enableDraftStreaming;
  if (patch.draftFlushIntervalMs !== undefined)
    nextPatch.draftFlushIntervalMs = patch.draftFlushIntervalMs;

  return nextPatch;
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
    proxyEnabled: Boolean(merged.proxyEnabled),
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
    enableDraftStreaming: merged.enableDraftStreaming ?? true,
    draftFlushIntervalMs: clamp(merged.draftFlushIntervalMs, 200, 2_000),
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
