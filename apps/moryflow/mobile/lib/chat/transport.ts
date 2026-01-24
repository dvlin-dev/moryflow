/**
 * Mobile Chat Transport
 *
 * 实现 AI SDK 的 ChatTransport 接口，与 PC 端 IpcChatTransport 对应。
 * 参考 PC 端 apps/moryflow/pc/src/main/chat/messages.ts 的 streamAgentRun 实现。
 */

import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai';
import type { RunItemStreamEvent } from '@openai/agents-core';
import { createSessionAdapter } from '@anyhunt/agents-runtime';
import type { AgentChatContext, AgentAttachmentContext } from '@anyhunt/agents-runtime';
import { getAgentRuntime, mobileSessionStore, createLogger } from '@/lib/agent-runtime';
import { generateUUID } from '@/lib/utils/uuid';
import { extractTextFromParts } from './utils';
import { mapRunToolEventToChunk } from './tool-chunks';

const logger = createLogger('[Transport]');

type SendOptions = Parameters<ChatTransport<UIMessage>['sendMessages']>[0];

export interface MobileChatTransportOptions {
  preferredModelId?: string;
  context?: AgentChatContext;
  attachments?: AgentAttachmentContext[];
}

/**
 * Mobile Chat Transport
 */
export class MobileChatTransport implements ChatTransport<UIMessage> {
  constructor(private readonly options: MobileChatTransportOptions = {}) {}

  async sendMessages({
    chatId,
    messages,
    abortSignal,
  }: SendOptions): Promise<ReadableStream<UIMessageChunk>> {
    const runtime = await getAgentRuntime();

    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    if (!lastUserMessage) {
      throw new Error('没有用户消息');
    }

    const input = extractTextFromParts(lastUserMessage.parts);
    if (!input.trim()) {
      throw new Error('输入不能为空');
    }

    const session = createSessionAdapter(chatId, mobileSessionStore);
    const { result, toolNames } = await runtime.runChatTurn({
      chatId,
      input,
      preferredModelId: this.options.preferredModelId,
      context: this.options.context,
      attachments: this.options.attachments,
      session,
      signal: abortSignal,
    });

    // 生成固定的消息 ID，整轮对话使用同一个
    const textMessageId = generateUUID();
    const reasoningMessageId = generateUUID();
    let textStarted = false;
    let reasoningStarted = false;

    return new ReadableStream<UIMessageChunk>({
      async start(controller) {
        try {
          controller.enqueue({ type: 'start' });

          for await (const event of result) {
            const eventType = getEventType(event);

            // 检测事件类型（优先使用 type 属性，fallback 到构造函数名）
            const isToolEvent = isEventType(
              event,
              eventType,
              'run_item_stream_event',
              'RunItemStreamEvent'
            );
            const isModelEvent = isEventType(
              event,
              eventType,
              'raw_model_stream_event',
              'RunRawModelStreamEvent'
            );

            // 处理工具事件
            if (isToolEvent) {
              const itemEvent = event as RunItemStreamEvent;
              if (__DEV__) {
                logToolEvent(itemEvent, eventType);
              }
              const chunk = mapRunToolEventToChunk(itemEvent, toolNames);
              if (__DEV__) {
                logger.debug('Tool chunk:', chunk ? JSON.stringify(chunk).slice(0, 200) : 'null');
              }
              if (chunk) {
                controller.enqueue(chunk);
              }
              continue;
            }

            // 处理 Model 流事件
            if (isModelEvent) {
              const extracted = extractModelStreamEvent(event);

              // reasoning 增量
              if (extracted.reasoningDelta) {
                if (!reasoningStarted) {
                  controller.enqueue({ type: 'reasoning-start', id: reasoningMessageId });
                  reasoningStarted = true;
                }
                controller.enqueue({
                  type: 'reasoning-delta',
                  id: reasoningMessageId,
                  delta: extracted.reasoningDelta,
                });
              }

              // 文本增量
              if (extracted.deltaText) {
                // 在开始文本之前，结束 reasoning
                if (reasoningStarted) {
                  controller.enqueue({ type: 'reasoning-end', id: reasoningMessageId });
                  reasoningStarted = false;
                }
                if (!textStarted) {
                  controller.enqueue({ type: 'text-start', id: textMessageId });
                  textStarted = true;
                }
                controller.enqueue({
                  type: 'text-delta',
                  id: textMessageId,
                  delta: extracted.deltaText,
                });
              }

              // 流结束
              if (extracted.isDone) {
                if (reasoningStarted) {
                  controller.enqueue({ type: 'reasoning-end', id: reasoningMessageId });
                  reasoningStarted = false;
                }
                if (textStarted) {
                  controller.enqueue({ type: 'text-end', id: textMessageId });
                  textStarted = false;
                }
              }
            }
          }

          // 确保 reasoning 和文本流正确结束
          if (reasoningStarted) {
            controller.enqueue({ type: 'reasoning-end', id: reasoningMessageId });
          }
          if (textStarted) {
            controller.enqueue({ type: 'text-end', id: textMessageId });
          }

          controller.enqueue({ type: 'finish', finishReason: 'stop' });
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}

// ============ 工具函数 ============

/**
 * 获取事件类型（使用 type 属性而不是 instanceof）
 */
function getEventType(event: unknown): string | undefined {
  if (!event || typeof event !== 'object') return undefined;
  return (event as { type?: string }).type;
}

/**
 * 检测事件类型
 *
 * 优先使用 type 属性，fallback 到构造函数名（仅开发环境有效）
 */
function isEventType(
  event: unknown,
  eventType: string | undefined,
  expectedType: string,
  expectedCtorName: string
): boolean {
  if (eventType === expectedType) return true;
  // 构造函数名 fallback（生产环境可能被混淆）
  if (__DEV__) {
    const ctorName = (event as object)?.constructor?.name;
    if (ctorName === expectedCtorName) return true;
  }
  return false;
}

/**
 * 记录工具事件详情（仅开发环境使用）
 */
function logToolEvent(itemEvent: RunItemStreamEvent, eventType: string | undefined): void {
  const itemObj = itemEvent.item as { type?: string; constructor?: { name?: string } };
  logger.debug('Tool event:', {
    eventType,
    name: itemEvent.name,
    itemType: itemObj?.type,
    itemCtor: itemObj?.constructor?.name,
  });
}

/** 流事件提取结果 */
interface StreamEventResult {
  deltaText: string;
  reasoningDelta: string;
  isDone: boolean;
}

const EMPTY_RESULT: StreamEventResult = { deltaText: '', reasoningDelta: '', isDone: false };

/**
 * 从 Agent 流事件中提取文本和 reasoning
 *
 * 事件类型（参考 PC 端 messages.ts）：
 * - { type: 'output_text_delta', delta: '...' } - 文本增量
 * - { type: 'response_done', response: {...} } - 响应完成
 * - { type: 'model', event: {...} } - 底层模型事件
 *   - event.type === 'reasoning-delta' - reasoning 增量
 *   - event.type === 'finish' - 完成事件
 */
function extractModelStreamEvent(event: unknown): StreamEventResult {
  if (!event || typeof event !== 'object') return EMPTY_RESULT;

  const record = event as { data?: unknown };
  const data = record.data;
  if (!data || typeof data !== 'object') return EMPTY_RESULT;

  const dataRecord = data as Record<string, unknown>;
  const eventType = dataRecord.type as string | undefined;

  // 文本增量事件（主要来源）
  if (eventType === 'output_text_delta' && typeof dataRecord.delta === 'string') {
    return { deltaText: dataRecord.delta, reasoningDelta: '', isDone: false };
  }

  // 响应完成事件
  if (eventType === 'response_done') {
    return { deltaText: '', reasoningDelta: '', isDone: true };
  }

  // 底层模型事件
  if (eventType === 'model') {
    const modelEvent = dataRecord.event as Record<string, unknown> | undefined;
    if (!modelEvent) return EMPTY_RESULT;

    // reasoning-delta 事件 - 思考过程增量
    if (modelEvent.type === 'reasoning-delta' && typeof modelEvent.delta === 'string') {
      return { deltaText: '', reasoningDelta: modelEvent.delta, isDone: false };
    }

    // finish 事件
    if (modelEvent.type === 'finish') {
      return { deltaText: '', reasoningDelta: '', isDone: true };
    }
  }

  return EMPTY_RESULT;
}
