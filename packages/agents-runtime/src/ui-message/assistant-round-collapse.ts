/**
 * [PROVIDES]: Assistant Round 分组/折叠状态/时长格式化与元数据写入纯函数
 * [DEPENDS]: ai.ChatStatus/UIMessage
 * [POS]: 跨端消息轮次折叠共享事实源（负责列表层与结论 message 的 orderedPart 显隐，不触碰 Tool/Reasoning 单条渲染）
 * [UPDATE]: 2026-03-06 - current round 判定改为绑定最新 user 边界，避免新一轮首 token 前误展开历史 round
 * [UPDATE]: 2026-03-06 - 扩展到结论 assistant message 内部 orderedPart 折叠，结束后仅保留最后一个非文件 part
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { isFileUIPart, type ChatStatus, type UIMessage } from 'ai';

export type AssistantRoundMetadata = {
  version: 1;
  roundId: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  processCount: number;
};

export type AssistantRound = {
  roundId: string;
  userIndex: number;
  firstAssistantIndex: number;
  conclusionIndex: number;
  processIndexes: number[];
  conclusionOrderedPartIndexes: number[];
  hiddenConclusionOrderedPartIndexes: number[];
  summaryAnchorMessageIndex: number;
  processCount: number;
  startedAt?: number;
  finishedAt?: number;
  durationMs?: number;
  metadata?: AssistantRoundMetadata;
};

export type AssistantRoundSummaryItem = {
  type: 'summary';
  roundId: string;
  round: AssistantRound;
  open: boolean;
  collapsed: boolean;
  durationMs?: number;
};

export type AssistantRoundMessageItem = {
  type: 'message';
  messageIndex: number;
};

export type AssistantRoundRenderItem = AssistantRoundSummaryItem | AssistantRoundMessageItem;

type ManualOpenPreference = boolean | null | undefined;

export type AssistantRoundTimestamps = {
  startedAt?: number;
  finishedAt?: number;
};

type ManualOpenPreferenceLookup =
  | Record<string, ManualOpenPreference>
  | Map<string, ManualOpenPreference>
  | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
};

const toNonNegativeInteger = (value: unknown): number | undefined => {
  const n = toFiniteNumber(value);
  if (n === undefined) {
    return undefined;
  }
  if (!Number.isInteger(n) || n < 0) {
    return undefined;
  }
  return n;
};

const resolvePositiveDurationMs = (value: number | undefined): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value;
};

const isRunningStatus = (status: string | null | undefined): status is ChatStatus =>
  status === 'submitted' || status === 'streaming';

const hasRenderableAssistantParts = (message: UIMessage): boolean =>
  message.role === 'assistant' && Array.isArray(message.parts) && message.parts.length > 0;

const resolveAssistantOrderedPartIndexes = (message: UIMessage): number[] => {
  if (!Array.isArray(message.parts) || message.parts.length === 0) {
    return [];
  }

  const orderedPartIndexes: number[] = [];
  let orderedPartIndex = 0;

  for (const part of message.parts) {
    if (isFileUIPart(part)) {
      continue;
    }
    orderedPartIndexes.push(orderedPartIndex);
    orderedPartIndex += 1;
  }

  return orderedPartIndexes;
};

const resolveRoundIdFallback = (
  message: UIMessage,
  firstAssistantIndex: number,
  conclusionIndex: number
) => {
  if (typeof message.id === 'string' && message.id.trim().length > 0) {
    return message.id;
  }
  return `assistant-round-${firstAssistantIndex}-${conclusionIndex}`;
};

const readAssistantRoundMetadata = (message: UIMessage): AssistantRoundMetadata | undefined => {
  if (!isRecord(message.metadata)) {
    return undefined;
  }
  const chat = isRecord(message.metadata.chat) ? message.metadata.chat : undefined;
  if (!chat || !isRecord(chat.assistantRound)) {
    return undefined;
  }
  const raw = chat.assistantRound;
  const version = toNonNegativeInteger(raw.version);
  const startedAt = toFiniteNumber(raw.startedAt);
  const finishedAt = toFiniteNumber(raw.finishedAt);
  const durationMs = toFiniteNumber(raw.durationMs);
  const processCount = toNonNegativeInteger(raw.processCount);
  const roundId = typeof raw.roundId === 'string' ? raw.roundId.trim() : '';

  if (
    version !== 1 ||
    !roundId ||
    startedAt === undefined ||
    finishedAt === undefined ||
    durationMs === undefined ||
    processCount === undefined
  ) {
    return undefined;
  }

  return {
    version: 1,
    roundId,
    startedAt,
    finishedAt,
    durationMs: Math.max(0, durationMs),
    processCount,
  };
};

export const resolveMessageTimestampMs = (message: UIMessage): number | undefined => {
  const createdAt = (message as { createdAt?: unknown }).createdAt;
  if (createdAt instanceof Date && Number.isFinite(createdAt.getTime())) {
    return createdAt.getTime();
  }
  if (typeof createdAt === 'number' && Number.isFinite(createdAt)) {
    return createdAt;
  }
  if (typeof createdAt === 'string' && createdAt.trim().length > 0) {
    const ms = Date.parse(createdAt);
    if (Number.isFinite(ms)) {
      return ms;
    }
  }
  return undefined;
};

export function resolveAssistantRounds(messages: UIMessage[]): AssistantRound[] {
  const grouped: Array<{ userIndex: number; assistantIndexes: number[] }> = [];
  let latestUserIndex = -1;

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (!message) {
      continue;
    }

    if (message.role === 'user') {
      latestUserIndex = index;
      continue;
    }

    if (!hasRenderableAssistantParts(message)) {
      continue;
    }

    const lastGroup = grouped[grouped.length - 1];
    if (!lastGroup || lastGroup.userIndex !== latestUserIndex) {
      grouped.push({ userIndex: latestUserIndex, assistantIndexes: [index] });
      continue;
    }
    lastGroup.assistantIndexes.push(index);
  }

  return grouped.map((group) => {
    const assistantIndexes = group.assistantIndexes;
    const firstAssistantIndex = assistantIndexes[0] ?? -1;
    const conclusionIndex = assistantIndexes[assistantIndexes.length - 1] ?? -1;
    const processIndexes = assistantIndexes.slice(0, -1);
    const conclusion = messages[conclusionIndex]!;
    const conclusionOrderedPartIndexes = resolveAssistantOrderedPartIndexes(conclusion);
    const hiddenConclusionOrderedPartIndexes = conclusionOrderedPartIndexes.slice(0, -1);
    const processCount = processIndexes.length + hiddenConclusionOrderedPartIndexes.length;
    const metadata = readAssistantRoundMetadata(conclusion);
    const firstMessage = messages[firstAssistantIndex]!;

    const startedAt = metadata?.startedAt ?? resolveMessageTimestampMs(firstMessage);
    const finishedAt = metadata?.finishedAt ?? resolveMessageTimestampMs(conclusion);
    const durationMs =
      metadata?.durationMs ??
      (startedAt !== undefined && finishedAt !== undefined
        ? Math.max(0, finishedAt - startedAt)
        : undefined);

    return {
      roundId:
        metadata?.roundId ??
        resolveRoundIdFallback(conclusion, firstAssistantIndex, conclusionIndex),
      userIndex: group.userIndex,
      firstAssistantIndex,
      conclusionIndex,
      processIndexes,
      conclusionOrderedPartIndexes,
      hiddenConclusionOrderedPartIndexes,
      summaryAnchorMessageIndex: processIndexes[0] ?? conclusionIndex,
      processCount,
      startedAt,
      finishedAt,
      durationMs,
      metadata,
    };
  });
}

const readManualOpenPreference = (
  input: ManualOpenPreferenceLookup,
  roundId: string
): ManualOpenPreference => {
  if (!input) {
    return undefined;
  }
  if (input instanceof Map) {
    return input.get(roundId);
  }
  return input[roundId];
};

const resolveLatestUserIndex = (messages: UIMessage[]): number => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      return index;
    }
  }
  return -1;
};

const resolveStableMessageId = (message: UIMessage | undefined): string | undefined => {
  if (!message) {
    return undefined;
  }
  if (typeof message.id !== 'string') {
    return undefined;
  }
  const trimmed = message.id.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const resolveAssistantRoundPreferenceScopeKey = ({
  messages,
  threadId,
}: {
  messages: UIMessage[];
  threadId?: string | null;
}): string => {
  if (typeof threadId === 'string') {
    const trimmed = threadId.trim();
    if (trimmed.length > 0) {
      return `thread:${trimmed}`;
    }
  }

  const firstUserMessage = messages.find((message) => message.role === 'user');
  const firstStableId =
    resolveStableMessageId(firstUserMessage) ?? resolveStableMessageId(messages[0]);

  return firstStableId ? `message:${firstStableId}` : '__empty__';
};

export function resolveAssistantRoundOpenState({
  status,
  hasManualExpanded,
  isCurrentRound = true,
}: {
  status: string | null | undefined;
  hasManualExpanded: boolean;
  isCurrentRound?: boolean;
}): boolean {
  if (hasManualExpanded) {
    return true;
  }
  return isCurrentRound && isRunningStatus(status);
}

export const formatAssistantRoundDuration = (durationMs: number): string => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return '0s';
  }

  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (totalMinutes < 60) {
    return seconds > 0 ? `${totalMinutes}m ${seconds}s` : `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

export function buildAssistantRoundRenderItems({
  messages,
  status,
  manualOpenPreferenceByRoundId,
}: {
  messages: UIMessage[];
  status: string | null | undefined;
  manualOpenPreferenceByRoundId?: ManualOpenPreferenceLookup;
}): {
  rounds: AssistantRound[];
  items: AssistantRoundRenderItem[];
  hiddenAssistantIndexSet: Set<number>;
  hiddenOrderedPartIndexesByMessageIndex: Map<number, Set<number>>;
} {
  const rounds = resolveAssistantRounds(messages);
  const items: AssistantRoundRenderItem[] = [];
  const hiddenAssistantIndexSet = new Set<number>();
  const hiddenOrderedPartIndexesByMessageIndex = new Map<number, Set<number>>();
  const summaryByAnchorMessageIndex = new Map<number, AssistantRoundSummaryItem>();
  const running = isRunningStatus(status);
  const latestUserIndex = resolveLatestUserIndex(messages);

  for (const round of rounds) {
    const isCurrentRound = running && round.userIndex === latestUserIndex;
    const autoOpen = resolveAssistantRoundOpenState({
      status,
      hasManualExpanded: false,
      isCurrentRound,
    });
    const manualOpenPreference = readManualOpenPreference(
      manualOpenPreferenceByRoundId,
      round.roundId
    );
    const open =
      manualOpenPreference === true ? true : manualOpenPreference === false ? false : autoOpen;
    const summaryVisible = round.processCount > 0 && !isCurrentRound;
    const collapsed = summaryVisible && !open;

    if (collapsed) {
      for (const processIndex of round.processIndexes) {
        hiddenAssistantIndexSet.add(processIndex);
      }
      if (round.hiddenConclusionOrderedPartIndexes.length > 0) {
        hiddenOrderedPartIndexesByMessageIndex.set(
          round.conclusionIndex,
          new Set(round.hiddenConclusionOrderedPartIndexes)
        );
      }
    }

    if (summaryVisible) {
      summaryByAnchorMessageIndex.set(round.summaryAnchorMessageIndex, {
        type: 'summary',
        roundId: round.roundId,
        round,
        open,
        collapsed,
        durationMs: resolvePositiveDurationMs(round.durationMs),
      });
    }
  }

  for (let index = 0; index < messages.length; index += 1) {
    const summary = summaryByAnchorMessageIndex.get(index);
    if (summary) {
      items.push(summary);
    }

    if (hiddenAssistantIndexSet.has(index)) {
      continue;
    }

    items.push({
      type: 'message',
      messageIndex: index,
    });
  }

  return {
    rounds,
    items,
    hiddenAssistantIndexSet,
    hiddenOrderedPartIndexesByMessageIndex,
  };
}

export const buildAssistantRoundMetadata = ({
  messages,
  round,
  startedAt,
  finishedAt = Date.now(),
}: {
  messages: UIMessage[];
  round: AssistantRound;
  startedAt?: number;
  finishedAt?: number;
}): AssistantRoundMetadata => {
  const firstMessage = messages[round.firstAssistantIndex];
  const normalizedFinishedAt = toFiniteNumber(finishedAt) ?? Date.now();
  const resolvedStartedAt =
    toFiniteNumber(startedAt) ??
    round.startedAt ??
    (firstMessage ? resolveMessageTimestampMs(firstMessage) : undefined) ??
    normalizedFinishedAt;
  const safeFinishedAt = Math.max(normalizedFinishedAt, resolvedStartedAt);
  const durationMs = Math.max(0, safeFinishedAt - resolvedStartedAt);

  return {
    version: 1,
    roundId: round.roundId,
    startedAt: resolvedStartedAt,
    finishedAt: safeFinishedAt,
    durationMs,
    processCount: round.processCount,
  };
};

const mergeAssistantRoundMetadata = (
  metadata: unknown,
  assistantRound: AssistantRoundMetadata
): Record<string, unknown> => {
  const nextMetadata = isRecord(metadata) ? { ...metadata } : {};
  const chat = isRecord(nextMetadata.chat) ? { ...nextMetadata.chat } : {};
  chat.assistantRound = assistantRound;
  nextMetadata.chat = chat;
  return nextMetadata;
};

export function annotateLatestAssistantRoundMetadata(
  messages: UIMessage[],
  timestamps: AssistantRoundTimestamps = {}
): {
  messages: UIMessage[];
  changed: boolean;
  round?: AssistantRound;
  metadata?: AssistantRoundMetadata;
} {
  const rounds = resolveAssistantRounds(messages);
  const round = rounds[rounds.length - 1];
  if (!round) {
    return { messages, changed: false };
  }

  const conclusion = messages[round.conclusionIndex];
  if (!conclusion) {
    return { messages, changed: false };
  }

  const metadata = buildAssistantRoundMetadata({
    messages,
    round,
    startedAt: timestamps.startedAt,
    finishedAt: timestamps.finishedAt,
  });
  const existing = readAssistantRoundMetadata(conclusion);
  if (
    existing &&
    existing.roundId === metadata.roundId &&
    existing.startedAt === metadata.startedAt &&
    existing.finishedAt === metadata.finishedAt &&
    existing.durationMs === metadata.durationMs &&
    existing.processCount === metadata.processCount
  ) {
    return { messages, changed: false, round, metadata: existing };
  }

  const nextMessages = [...messages];
  nextMessages[round.conclusionIndex] = {
    ...conclusion,
    metadata: mergeAssistantRoundMetadata(conclusion.metadata, metadata),
  };

  return {
    messages: nextMessages,
    changed: true,
    round,
    metadata,
  };
}
