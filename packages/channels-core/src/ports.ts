/**
 * [DEFINES]: 渠道运行时持久化端口（offset/session/sent/pairing）
 * [USED_BY]: channels-telegram runtime, pc main repository adapters
 * [POS]: 跨包依赖倒置边界
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { ChannelKind, PairingRequest, PairingRequestStatus } from './types';

export type SessionMapping = {
  channel: ChannelKind;
  accountId: string;
  peerKey: string;
  threadKey: string;
  sessionKey: string;
  updatedAt: string;
};

export type SafeWatermarkRepository = {
  getSafeWatermark: (accountId: string) => Promise<number | null>;
  setSafeWatermark: (accountId: string, updateId: number) => Promise<void>;
};

export type SessionRepository = {
  upsertSession: (mapping: SessionMapping) => Promise<void>;
  getSession: (input: {
    channel: ChannelKind;
    accountId: string;
    peerKey: string;
    threadKey: string;
  }) => Promise<SessionMapping | null>;
};

export type SentMessageRepository = {
  rememberSentMessage: (input: {
    accountId: string;
    chatId: string;
    messageId: string;
    sentAt: string;
  }) => Promise<void>;
};

export type PairingRepository = {
  hasApprovedSender: (input: {
    channel: ChannelKind;
    accountId: string;
    senderId: string;
  }) => Promise<boolean>;
  createPairingRequest: (input: {
    channel: ChannelKind;
    accountId: string;
    senderId: string;
    peerId: string;
    code: string;
    meta?: Record<string, unknown>;
    createdAt: string;
    expiresAt: string;
  }) => Promise<PairingRequest>;
  updatePairingRequestStatus: (input: {
    requestId: string;
    status: PairingRequestStatus;
    updatedAt: string;
  }) => Promise<void>;
  listPairingRequests: (input: {
    channel: ChannelKind;
    accountId?: string;
    status?: PairingRequestStatus;
  }) => Promise<PairingRequest[]>;
  approveSender: (input: {
    channel: ChannelKind;
    accountId: string;
    senderId: string;
    approvedAt: string;
  }) => Promise<void>;
};
