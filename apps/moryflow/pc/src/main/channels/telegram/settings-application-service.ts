/**
 * [INPUT]: Telegram settings 更新请求 + secret storage
 * [OUTPUT]: Telegram settings snapshot（含 runtime 同步）
 * [POS]: Telegram settings application service（配置/凭据应用边界）
 * [UPDATE]: 2026-03-04 - getSettings snapshot 改为回填 botTokenEcho/proxyUrl，避免明文 bot token 进入 renderer
 * [UPDATE]: 2026-03-05 - 新增 detectProxySuggestion：进入 Agent 自动探测直连/系统代理/环境代理并返回建议
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
import { createTelegramBotTokenEcho, parseTelegramBotTokenEcho } from './bot-token-echo.js';
import fetch from 'node-fetch';
import { ProxyAgent } from 'proxy-agent';
import { getTelegramSettingsStore, updateTelegramSettingsStore } from './settings-store.js';
import type {
  TelegramAccountSettings,
  TelegramProxySuggestionInput,
  TelegramProxySuggestionResult,
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
const PROXY_ENV_KEYS = [
  'HTTPS_PROXY',
  'https_proxy',
  'HTTP_PROXY',
  'http_proxy',
  'ALL_PROXY',
  'all_proxy',
] as const;

type ProxyAgentLike = {
  destroy?: () => void;
};
type ReachabilityProbeResult = {
  ok: boolean;
  statusCode?: number;
  elapsedMs: number;
  error?: unknown;
};
type ResolveSystemProxyCandidates = () => Promise<string[]>;

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

const normalizeProxyCandidate = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === 'DIRECT') {
    return null;
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'socks:' || protocol === 'socks4:' || protocol === 'socks4a:') {
      parsed.protocol = 'socks5:';
    }
    if (!ALLOWED_PROXY_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
};

const parseElectronProxyToken = (token: string): string | null => {
  const trimmed = token.trim();
  if (!trimmed || trimmed.toUpperCase() === 'DIRECT') {
    return null;
  }

  const matched = trimmed.match(/^([A-Za-z0-9_]+)\s+(.+)$/);
  if (!matched) {
    return normalizeProxyCandidate(trimmed);
  }

  const scheme = matched[1].toUpperCase();
  const endpoint = matched[2].trim();
  if (!endpoint) {
    return null;
  }

  if (scheme === 'PROXY' || scheme === 'HTTP') {
    return normalizeProxyCandidate(`http://${endpoint}`);
  }
  if (scheme === 'HTTPS') {
    return normalizeProxyCandidate(`https://${endpoint}`);
  }
  if (scheme === 'SOCKS' || scheme === 'SOCKS4' || scheme === 'SOCKS5') {
    return normalizeProxyCandidate(`socks5://${endpoint}`);
  }

  return normalizeProxyCandidate(trimmed);
};

const parseElectronProxySpec = (value: string): string[] => {
  if (!value.trim()) {
    return [];
  }
  return value
    .split(';')
    .map((token) => parseElectronProxyToken(token))
    .filter((item): item is string => Boolean(item));
};

const dedupeProxyCandidates = (candidates: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const candidate of candidates) {
    const normalized = normalizeProxyCandidate(candidate);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
};

const resolveSystemProxyCandidatesDefault: ResolveSystemProxyCandidates = async () => {
  try {
    const electron = await import('electron');
    const defaultSession = electron.session?.defaultSession;
    const resolveProxy =
      defaultSession && typeof defaultSession.resolveProxy === 'function'
        ? defaultSession.resolveProxy.bind(defaultSession)
        : null;
    if (!resolveProxy) {
      return [];
    }
    const proxySpec = await resolveProxy(TELEGRAM_API_HEALTHCHECK_URL);
    return dedupeProxyCandidates(parseElectronProxySpec(String(proxySpec ?? '')));
  } catch {
    return [];
  }
};

const resolveEnvProxyCandidates = (env: NodeJS.ProcessEnv): string[] => {
  const values = PROXY_ENV_KEYS.map((key) => env[key]).filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );
  const splitValues = values.flatMap((value) =>
    value
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  );
  return dedupeProxyCandidates(splitValues);
};

const probeTelegramApiReachability = async (input: {
  proxyUrl?: string;
  timeoutMs?: number;
}): Promise<ReachabilityProbeResult> => {
  const timeoutMs = input.timeoutMs ?? TELEGRAM_PROXY_TEST_TIMEOUT_MS;
  const startedAt = Date.now();
  let proxyAgent: ProxyAgentLike | null = null;

  try {
    if (input.proxyUrl) {
      const normalizedProxyUrl = normalizeProxyUrl(input.proxyUrl);
      ensureValidProxyUrl(normalizedProxyUrl);
      proxyAgent = new ProxyAgent({
        getProxyForUrl: () => normalizedProxyUrl,
      }) as ProxyAgentLike;
    }

    const response = await fetch(TELEGRAM_API_HEALTHCHECK_URL, {
      method: 'GET',
      agent: proxyAgent as any,
      signal: AbortSignal.timeout(timeoutMs) as any,
    });
    return {
      ok: true,
      statusCode: response.status,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      elapsedMs: Date.now() - startedAt,
      error,
    };
  } finally {
    destroyProxyAgent(proxyAgent);
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
          botTokenEcho:
            typeof botToken === 'string' && botToken.trim().length > 0
              ? createTelegramBotTokenEcho({
                  accountId,
                  token: botToken,
                })
              : undefined,
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
  detectProxySuggestion: (
    input: TelegramProxySuggestionInput
  ) => Promise<TelegramProxySuggestionResult>;
};

export const createTelegramSettingsApplicationService = (input: {
  runtimeSync: RuntimeSync;
  resolveSystemProxyCandidates?: ResolveSystemProxyCandidates;
  env?: NodeJS.ProcessEnv;
}): TelegramSettingsApplicationService => {
  const resolveSystemProxyCandidates =
    input.resolveSystemProxyCandidates ?? resolveSystemProxyCandidatesDefault;
  const env = input.env ?? process.env;

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
          const echoedToken = parseTelegramBotTokenEcho({
            accountId,
            value: token,
          });
          if (!echoedToken) {
            await setTelegramBotToken(accountId, token);
          }
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

      const probe = await probeTelegramApiReachability({ proxyUrl });
      if (probe.ok) {
        return {
          ok: true,
          message: 'Proxy connection to Telegram API succeeded.',
          statusCode: probe.statusCode,
          elapsedMs: probe.elapsedMs,
        };
      }
      return {
        ok: false,
        message: toProxyTestErrorMessage(probe.error),
        elapsedMs: probe.elapsedMs,
      };
    },
    detectProxySuggestion: async (payload) => {
      const accountId = payload.accountId.trim();
      if (!accountId) {
        throw new Error('accountId is required');
      }

      const [systemCandidates, envCandidates] = await Promise.all([
        resolveSystemProxyCandidates(),
        Promise.resolve(resolveEnvProxyCandidates(env)),
      ]);
      const candidates = dedupeProxyCandidates([...systemCandidates, ...envCandidates]);

      const directProbe = await probeTelegramApiReachability({});
      if (directProbe.ok) {
        return {
          proxyEnabled: false,
          reason: 'direct_reachable',
          message: 'Telegram API is reachable without proxy.',
          candidates,
        };
      }

      if (candidates.length === 0) {
        return {
          proxyEnabled: false,
          reason: 'no_proxy_candidate',
          message: 'No proxy candidate was detected. Configure proxy manually and test it.',
          candidates,
        };
      }

      let lastProbeError: unknown = directProbe.error;
      for (const candidate of candidates) {
        const probe = await probeTelegramApiReachability({ proxyUrl: candidate });
        if (probe.ok) {
          return {
            proxyEnabled: true,
            proxyUrl: candidate,
            reason: 'proxy_candidate_reachable',
            message: 'Detected a working proxy for Telegram API.',
            candidates,
          };
        }
        lastProbeError = probe.error;
      }

      return {
        proxyEnabled: false,
        reason: 'proxy_candidate_unreachable',
        message: toProxyTestErrorMessage(lastProbeError),
        candidates,
      };
    },
  };
};
