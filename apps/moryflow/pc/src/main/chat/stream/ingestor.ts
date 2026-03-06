/**
 * [PROVIDES]: RunStreamEvent -> CanonicalChatEvent 归一化转换
 * [DEPENDS]: @moryflow/agents-runtime（raw/run_item 类型判断与 normalizer）
 * [POS]: 对话流状态机的事件入口层（只做协议解析，不做状态推进）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { RunModelStreamNormalizer } from '@moryflow/agents-runtime';
import { isRunItemStreamEvent, isRunRawModelStreamEvent } from '@moryflow/agents-runtime';

import type { CanonicalChatEvent } from './types.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getRawEventType = (data: unknown): string => {
  if (!isRecord(data)) {
    return 'unknown';
  }
  return typeof data.type === 'string' ? data.type : 'unknown';
};

const getRunItemType = (item: unknown): string => {
  if (!isRecord(item)) {
    return 'unknown';
  }
  return typeof item.type === 'string' ? item.type : 'unknown';
};

export const ingestRunStreamEvent = ({
  event,
  eventIndex,
  normalizer,
}: {
  event: unknown;
  eventIndex: number;
  normalizer: RunModelStreamNormalizer;
}): CanonicalChatEvent[] => {
  if (isRunItemStreamEvent(event)) {
    return [
      {
        kind: 'run-item',
        eventIndex,
        eventName: event.name,
        itemType: getRunItemType(event.item),
        event,
      },
    ];
  }

  if (isRunRawModelStreamEvent(event)) {
    const rawEventType = getRawEventType(event.data);
    return [
      {
        kind: 'raw-model',
        eventIndex,
        rawEventType,
        rawData: event.data,
        extracted: normalizer.consume(event.data),
      },
    ];
  }

  return [
    {
      kind: 'unknown',
      eventIndex,
      rawEvent: event,
    },
  ];
};
