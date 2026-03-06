/**
 * [DEFINES]: 对话流 canonical 事件、状态机状态与 reducer 依赖类型
 * [USED_BY]: chat/stream/{ingestor,reducer,emitter,debug-ledger} 与 chat/messages.ts
 * [POS]: Chat 主进程对话流状态机类型单源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { FinishReason, UIMessageChunk } from 'ai';
import type { RunToolApprovalItem } from '@openai/agents-core';
import type {
  ExtractedRunModelStreamEvent,
  RunItemStreamEventLike,
} from '@moryflow/agents-runtime';

import type { TokenUsage } from '../../../shared/ipc.js';

export type StreamThinkingContext = {
  requested?: { mode: 'off' } | { mode: 'level'; level: string };
  resolvedLevel?: string;
  downgradedToOff?: boolean;
  downgradeReason?: 'requested-level-not-allowed' | 'reasoning-config-unavailable';
};

export type StreamCanonicalRunItemEvent = {
  kind: 'run-item';
  eventIndex: number;
  eventName: string;
  itemType: string;
  event: RunItemStreamEventLike;
};

export type StreamCanonicalRawEvent = {
  kind: 'raw-model';
  eventIndex: number;
  rawEventType: string;
  rawData: unknown;
  extracted: ExtractedRunModelStreamEvent;
};

export type StreamCanonicalUnknownEvent = {
  kind: 'unknown';
  eventIndex: number;
  rawEvent: unknown;
};

export type CanonicalChatEvent =
  | StreamCanonicalRunItemEvent
  | StreamCanonicalRawEvent
  | StreamCanonicalUnknownEvent;

export type StreamSegmentState = {
  id: string;
  open: boolean;
};

export type TurnStreamState = {
  messageStarted: boolean;
  text: StreamSegmentState;
  reasoning: StreamSegmentState;
  hasReasoningDelta: boolean;
  hasTextDelta: boolean;
  canonicalTextDeltaCount: number;
  canonicalReasoningDeltaCount: number;
  canonicalDoneSeen: boolean;
  finishReason?: FinishReason;
  totalUsage: TokenUsage;
  thinkingRequested: boolean;
  thinkingResolvedLevel: string;
  thinkingDowngradedToOff: boolean;
  thinkingDowngradeReason?: StreamThinkingContext['downgradeReason'];
  reasoningSources: Record<string, number>;
  rawEventTypeCounts: Record<string, number>;
  ignoredRawEventTypeCounts: Record<string, number>;
  runItemEventNameCounts: Record<string, number>;
  textDeltaChunks: number;
  toolChunks: number;
  approvalRequests: number;
};

export type StreamReduceContext = {
  toolNames?: string[];
  onToolApprovalRequest?: (
    item: RunToolApprovalItem
  ) => { approvalId: string; toolCallId: string } | null;
  randomUUID: () => string;
  resolveApprovalToolCallId: (item: RunToolApprovalItem) => string;
};

export type StreamReduceResult = {
  chunks: UIMessageChunk[];
};
