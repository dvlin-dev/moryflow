/**
 * [INPUT]: InboundEnvelope
 * [OUTPUT]: ThreadResolution(peerKey/threadKey)
 * [POS]: 跨渠道线程键单一算法（DM/group topic/callback/reaction 共用）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { InboundEnvelope, ThreadResolution } from './types';

const ROOT_THREAD = 'root';

const normalizeThreadId = (value: string | undefined): string => {
  if (!value) {
    return ROOT_THREAD;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : ROOT_THREAD;
};

export const resolveThreadKey = (envelope: InboundEnvelope): ThreadResolution => {
  const threadPart = normalizeThreadId(envelope.message.threadId);
  const peerKey = `${envelope.channel}:${envelope.accountId}:peer:${envelope.peer.id}`;
  const threadKey = `${peerKey}:thread:${threadPart}`;

  return {
    peerKey,
    threadKey,
  };
};
