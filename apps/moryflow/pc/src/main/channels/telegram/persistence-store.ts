/**
 * [INPUT]: Telegram runtime persistence read/write requests
 * [OUTPUT]: Telegram 持久化仓储（offset/conversation-binding/sent/pairing）
 * [POS]: Telegram 主进程 runtime 持久化实现（electron-store）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { randomUUID } from 'node:crypto';
import Store from 'electron-store';
import type {
  PairingRepository,
  PairingRequest,
  SafeWatermarkRepository,
  SentMessageRepository,
} from '@moryflow/channels-core';

export type TelegramConversationBinding = {
  channel: 'telegram';
  accountId: string;
  peerKey: string;
  threadKey: string;
  conversationId: string;
  updatedAt: string;
  peerTitle?: string;
  peerUsername?: string;
};

export type TelegramConversationBindingRepository = {
  upsertByThread: (binding: TelegramConversationBinding) => Promise<void>;
  getByThread: (input: {
    channel: 'telegram';
    accountId: string;
    peerKey: string;
    threadKey: string;
  }) => Promise<TelegramConversationBinding | null>;
  listAll: () => Promise<TelegramConversationBinding[]>;
};

export type TelegramPersistenceStore = {
  offsets: SafeWatermarkRepository;
  conversationBindings: TelegramConversationBindingRepository;
  sentMessages: SentMessageRepository;
  pairing: PairingRepository;
  getPairingRequestById: (requestId: string) => PairingRequest | null;
};

type PersistedOffset = {
  safeWatermarkUpdateId: number;
  updatedAt: string;
};

type PersistedApprovedSender = {
  approvedAt: string;
};

type PersistedPairingRequest = {
  id: string;
  channel: 'telegram';
  accountId: string;
  senderId: string;
  peerId: string;
  code: string;
  status: PairingRequest['status'];
  meta?: Record<string, unknown>;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

type TelegramRuntimePersistenceSchema = {
  offsetsByAccountId: Record<string, PersistedOffset>;
  conversationBindingsByKey: Record<string, TelegramConversationBinding>;
  pairingRequestsById: Record<string, PersistedPairingRequest>;
  approvedSendersByKey: Record<string, PersistedApprovedSender>;
};

const DEFAULT_STORE: TelegramRuntimePersistenceSchema = {
  offsetsByAccountId: {},
  conversationBindingsByKey: {},
  pairingRequestsById: {},
  approvedSendersByKey: {},
};

let singleton: TelegramPersistenceStore | null = null;

const runtimeStore = new Store<TelegramRuntimePersistenceSchema>({
  name: 'telegram-runtime-persistence',
  defaults: DEFAULT_STORE,
});

const encodeCompositeKey = (parts: string[]): string => JSON.stringify(parts);

const buildConversationBindingKey = (input: {
  channel: 'telegram';
  accountId: string;
  peerKey: string;
  threadKey: string;
}) => encodeCompositeKey([input.channel, input.accountId, input.peerKey, input.threadKey]);

const buildApprovedSenderKey = (input: {
  channel: 'telegram';
  accountId: string;
  senderId: string;
}) => encodeCompositeKey([input.channel, input.accountId, input.senderId]);

const normalizeStore = (
  input: TelegramRuntimePersistenceSchema | undefined
): TelegramRuntimePersistenceSchema => ({
  offsetsByAccountId: input?.offsetsByAccountId ?? {},
  conversationBindingsByKey: input?.conversationBindingsByKey ?? {},
  pairingRequestsById: input?.pairingRequestsById ?? {},
  approvedSendersByKey: input?.approvedSendersByKey ?? {},
});

const readStore = (): TelegramRuntimePersistenceSchema => normalizeStore(runtimeStore.store);

const writeStore = (next: TelegramRuntimePersistenceSchema): void => {
  runtimeStore.store = next;
};

const mapPairingRequest = (request: PersistedPairingRequest): PairingRequest => ({
  id: request.id,
  channel: request.channel,
  accountId: request.accountId,
  senderId: request.senderId,
  peerId: request.peerId,
  code: request.code,
  status: request.status,
  meta: request.meta,
  createdAt: request.createdAt,
  lastSeenAt: request.lastSeenAt,
  expiresAt: request.expiresAt,
});

const compareCreatedAtDesc = (left: PersistedPairingRequest, right: PersistedPairingRequest) =>
  right.createdAt.localeCompare(left.createdAt);

const expirePendingRequests = (
  state: TelegramRuntimePersistenceSchema,
  nowIso: string
): TelegramRuntimePersistenceSchema => {
  let changed = false;
  const nextRequests: Record<string, PersistedPairingRequest> = {};

  for (const [requestId, request] of Object.entries(state.pairingRequestsById)) {
    if (request.status === 'pending' && request.expiresAt <= nowIso) {
      changed = true;
      nextRequests[requestId] = {
        ...request,
        status: 'expired',
        lastSeenAt: nowIso,
      };
      continue;
    }
    nextRequests[requestId] = request;
  }

  if (!changed) {
    return state;
  }

  return {
    ...state,
    pairingRequestsById: nextRequests,
  };
};

const withExpiredRequests = (nowIso: string): TelegramRuntimePersistenceSchema => {
  const state = readStore();
  const nextState = expirePendingRequests(state, nowIso);
  if (nextState !== state) {
    writeStore(nextState);
  }
  return nextState;
};

const createStore = (): TelegramPersistenceStore => {
  const offsets: SafeWatermarkRepository = {
    getSafeWatermark: async (accountId) => {
      const row = readStore().offsetsByAccountId[accountId];
      return row ? row.safeWatermarkUpdateId : null;
    },
    setSafeWatermark: async (accountId, updateId) => {
      const state = readStore();
      writeStore({
        ...state,
        offsetsByAccountId: {
          ...state.offsetsByAccountId,
          [accountId]: {
            safeWatermarkUpdateId: updateId,
            updatedAt: new Date().toISOString(),
          },
        },
      });
    },
  };

  const conversationBindings: TelegramConversationBindingRepository = {
    upsertByThread: async (binding) => {
      const state = readStore();
      const key = buildConversationBindingKey(binding);
      const existing = state.conversationBindingsByKey[key];
      writeStore({
        ...state,
        conversationBindingsByKey: {
          ...state.conversationBindingsByKey,
          [key]: {
            ...binding,
            peerTitle: binding.peerTitle ?? existing?.peerTitle,
            peerUsername: binding.peerUsername ?? existing?.peerUsername,
          },
        },
      });
    },
    getByThread: async (input) => {
      const key = buildConversationBindingKey(input);
      return readStore().conversationBindingsByKey[key] ?? null;
    },
    listAll: async () => {
      return Object.values(readStore().conversationBindingsByKey);
    },
  };

  const sentMessages: SentMessageRepository = {
    // The current runtime contract never reads sent-message records back.
    rememberSentMessage: async () => undefined,
  };

  const pairing: PairingRepository = {
    hasApprovedSender: async (input) => {
      const key = buildApprovedSenderKey(input);
      return Boolean(readStore().approvedSendersByKey[key]);
    },
    createPairingRequest: async (input) => {
      const state = withExpiredRequests(input.createdAt);
      const existing = Object.values(state.pairingRequestsById)
        .filter(
          (request) =>
            request.channel === input.channel &&
            request.accountId === input.accountId &&
            request.senderId === input.senderId &&
            request.status === 'pending'
        )
        .sort(compareCreatedAtDesc)[0];

      if (existing) {
        const updated: PersistedPairingRequest = {
          ...existing,
          peerId: input.peerId,
          code: input.code,
          meta: input.meta,
          lastSeenAt: input.createdAt,
          expiresAt: input.expiresAt,
        };
        writeStore({
          ...state,
          pairingRequestsById: {
            ...state.pairingRequestsById,
            [existing.id]: updated,
          },
        });
        return mapPairingRequest(updated);
      }

      const created: PersistedPairingRequest = {
        id: `pair_${randomUUID()}`,
        channel: input.channel,
        accountId: input.accountId,
        senderId: input.senderId,
        peerId: input.peerId,
        code: input.code,
        status: 'pending',
        ...(input.meta ? { meta: input.meta } : {}),
        createdAt: input.createdAt,
        lastSeenAt: input.createdAt,
        expiresAt: input.expiresAt,
      };
      writeStore({
        ...state,
        pairingRequestsById: {
          ...state.pairingRequestsById,
          [created.id]: created,
        },
      });
      return mapPairingRequest(created);
    },
    updatePairingRequestStatus: async (input) => {
      const state = readStore();
      const existing = state.pairingRequestsById[input.requestId];
      if (!existing) {
        return;
      }

      writeStore({
        ...state,
        pairingRequestsById: {
          ...state.pairingRequestsById,
          [input.requestId]: {
            ...existing,
            status: input.status,
            lastSeenAt: input.updatedAt,
          },
        },
      });
    },
    listPairingRequests: async (input) => {
      const state = withExpiredRequests(new Date().toISOString());
      return Object.values(state.pairingRequestsById)
        .filter((request) => request.channel === input.channel)
        .filter((request) => !input.accountId || request.accountId === input.accountId)
        .filter((request) => !input.status || request.status === input.status)
        .sort(compareCreatedAtDesc)
        .map(mapPairingRequest);
    },
    approveSender: async (input) => {
      const state = readStore();
      const key = buildApprovedSenderKey(input);
      writeStore({
        ...state,
        approvedSendersByKey: {
          ...state.approvedSendersByKey,
          [key]: {
            approvedAt: input.approvedAt,
          },
        },
      });
    },
  };

  const getPairingRequestById = (requestId: string): PairingRequest | null => {
    const state = withExpiredRequests(new Date().toISOString());
    const request = state.pairingRequestsById[requestId];
    return request ? mapPairingRequest(request) : null;
  };

  return {
    offsets,
    conversationBindings,
    sentMessages,
    pairing,
    getPairingRequestById,
  };
};

export const getTelegramPersistenceStore = (): TelegramPersistenceStore => {
  if (!singleton) {
    singleton = createStore();
  }
  return singleton;
};
