/**
 * [INPUT]: Telegram 配置更新/审批操作/运行时生命周期
 * [OUTPUT]: Telegram settings/status/pairing 服务能力
 * [POS]: PC Telegram 服务装配层（协调 settings/runtime/pairing 子服务）
 * [UPDATE]: 2026-03-05 - 新增 detectProxySuggestion 透传，统一主进程自动代理探测入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { PairingRequestStatus } from '@moryflow/channels-core';
import { getTelegramSettingsStore } from './settings-store.js';
import { createTelegramRuntimeOrchestrator } from './runtime-orchestrator.js';
import { createTelegramSettingsApplicationService } from './settings-application-service.js';
import { createTelegramPairingAdminService } from './pairing-admin-service.js';
import type {
  TelegramPairingRequestItem,
  TelegramProxySuggestionInput,
  TelegramProxySuggestionResult,
  TelegramProxyTestInput,
  TelegramProxyTestResult,
  TelegramRuntimeStatusSnapshot,
  TelegramSettingsSnapshot,
  TelegramSettingsUpdateInput,
} from './types.js';

const runtimeOrchestrator = createTelegramRuntimeOrchestrator();
const settingsApplicationService = createTelegramSettingsApplicationService({
  runtimeSync: runtimeOrchestrator,
});
const pairingAdminService = createTelegramPairingAdminService();
let initialized = false;
let initPromise: Promise<void> | null = null;

export const telegramChannelService = {
  async init(): Promise<void> {
    if (initialized) {
      return;
    }
    if (initPromise) {
      await initPromise;
      return;
    }

    initPromise = (async () => {
      const store = getTelegramSettingsStore();
      await runtimeOrchestrator.applyAccounts(store.accounts);
      initialized = true;
    })()
      .catch((error) => {
        initialized = false;
        throw error;
      })
      .finally(() => {
        initPromise = null;
      });

    await initPromise;
  },

  async shutdown(): Promise<void> {
    if (initPromise) {
      try {
        await initPromise;
      } catch {
        // init 失败后继续执行 shutdown，保证状态可重置
      }
    }
    await runtimeOrchestrator.shutdown();
    initialized = false;
    initPromise = null;
  },

  async isSecretStorageAvailable(): Promise<boolean> {
    return settingsApplicationService.isSecretStorageAvailable();
  },

  async getSettings(): Promise<TelegramSettingsSnapshot> {
    return settingsApplicationService.getSettings();
  },

  async updateSettings(input: TelegramSettingsUpdateInput): Promise<TelegramSettingsSnapshot> {
    return settingsApplicationService.updateSettings(input);
  },

  async testProxyConnection(input: TelegramProxyTestInput): Promise<TelegramProxyTestResult> {
    return settingsApplicationService.testProxyConnection(input);
  },

  async detectProxySuggestion(
    input: TelegramProxySuggestionInput
  ): Promise<TelegramProxySuggestionResult> {
    return settingsApplicationService.detectProxySuggestion(input);
  },

  async getStatus(): Promise<TelegramRuntimeStatusSnapshot> {
    return runtimeOrchestrator.getStatusSnapshot();
  },

  subscribeStatus(listener: (status: TelegramRuntimeStatusSnapshot) => void): () => void {
    return runtimeOrchestrator.subscribeStatus(listener);
  },

  async listPairingRequests(input?: {
    accountId?: string;
    status?: PairingRequestStatus;
  }): Promise<TelegramPairingRequestItem[]> {
    return pairingAdminService.listPairingRequests(input);
  },

  async approvePairingRequest(requestId: string): Promise<void> {
    await pairingAdminService.approvePairingRequest(requestId);
  },

  async denyPairingRequest(requestId: string): Promise<void> {
    await pairingAdminService.denyPairingRequest(requestId);
  },
};
