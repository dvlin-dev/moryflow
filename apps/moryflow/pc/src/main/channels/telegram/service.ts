/**
 * [INPUT]: Telegram 配置更新/审批操作/运行时生命周期
 * [OUTPUT]: Telegram settings/status/pairing 服务能力
 * [POS]: PC Telegram 服务装配层（协调 settings/runtime/pairing 子服务）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { OutboundEnvelope, PairingRequestStatus } from '@moryflow/channels-core';
import { getTelegramSettingsStore } from './settings-store.js';
import { createTelegramRuntimeOrchestrator } from './runtime-orchestrator.js';
import { createTelegramSettingsApplicationService } from './settings-application-service.js';
import { createTelegramPairingAdminService } from './pairing-admin-service.js';
import { getTelegramPersistenceStore } from './persistence-store.js';
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

  async sendEnvelope(envelope: OutboundEnvelope): Promise<void> {
    await runtimeOrchestrator.sendEnvelope(envelope);
  },

  async ensureReplyConversation(input: {
    accountId: string;
    chatId: string;
    threadId?: string;
  }): Promise<{
    peerKey: string;
    threadKey: string;
    conversationId: string;
  }> {
    return runtimeOrchestrator.ensureReplyConversation(input);
  },

  async listKnownChats(): Promise<
    Array<{
      accountId: string;
      chatId: string;
      threadId?: string;
      conversationId: string;
      lastActiveAt: string;
      title?: string;
      username?: string;
    }>
  > {
    const store = getTelegramPersistenceStore();
    const bindings = await store.conversationBindings.listAll();
    return bindings.map((b) => {
      const rawChatId = b.peerKey.split(':peer:')[1] ?? b.peerKey;
      const rawThreadPart = b.threadKey.split(':thread:')[1];
      const rawThreadId = rawThreadPart && rawThreadPart !== 'root' ? rawThreadPart : undefined;
      return {
        accountId: b.accountId,
        chatId: rawChatId,
        threadId: rawThreadId,
        conversationId: b.conversationId,
        lastActiveAt: b.updatedAt,
        title: b.peerTitle,
        username: b.peerUsername,
      };
    });
  },
};
