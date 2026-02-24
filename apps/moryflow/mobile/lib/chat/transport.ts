/**
 * Mobile Chat Transport
 *
 * 实现 AI SDK 的 ChatTransport 接口，与 PC 端 IpcChatTransport 对应。
 * 参考 PC 端 apps/moryflow/pc/src/main/chat/messages.ts 的 streamAgentRun 实现。
 */

import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai';
import type { Agent, RunState, RunToolApprovalItem } from '@openai/agents-core';
import { run } from '@openai/agents-core';
import {
  createSessionAdapter,
  extractRunRawModelStreamEvent,
  isRunItemStreamEvent,
  isRunRawModelStreamEvent,
  mapRunToolEventToChunk,
  resolveToolCallIdFromRawItem,
} from '@anyhunt/agents-runtime';
import type {
  AgentChatContext,
  AgentAttachmentContext,
  AgentContext,
  AgentAccessMode,
  RunItemStreamEventLike,
} from '@anyhunt/agents-runtime';
import { getAgentRuntime, mobileSessionStore, createLogger } from '@/lib/agent-runtime';
import { generateUUID } from '@/lib/utils/uuid';
import { extractTextFromParts } from './utils';
import {
  createApprovalGate,
  registerApprovalRequest,
  waitForApprovals,
  hasPendingApprovals,
  clearApprovalGate,
} from './approval-store';

const logger = createLogger('[Transport]');

type SendOptions = Parameters<ChatTransport<UIMessage>['sendMessages']>[0];

export interface MobileChatTransportOptions {
  preferredModelId?: string;
  context?: AgentChatContext;
  attachments?: AgentAttachmentContext[];
  mode?: AgentAccessMode;
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
    const transportOptions = this.options;

    // 生成固定的消息 ID，整轮对话使用同一个
    const textMessageId = generateUUID();
    const reasoningMessageId = generateUUID();
    let textStarted = false;
    let reasoningStarted = false;

    return new ReadableStream<UIMessageChunk>({
      async start(controller) {
        let resumedState: RunState<AgentContext, Agent<AgentContext>> | null = null;
        let activeAgent: Agent<AgentContext> | null = null;
        let closed = false;

        const resolveToolCallId = (item: RunToolApprovalItem): string => {
          return resolveToolCallIdFromRawItem(item.rawItem, generateUUID);
        };

        try {
          controller.enqueue({ type: 'start' });

          while (true) {
            if (abortSignal?.aborted) {
              clearApprovalGate(chatId);
              break;
            }

            const { result, toolNames, agent } = resumedState
              ? {
                  result: await run(activeAgent as Agent<AgentContext>, resumedState, {
                    stream: true,
                    signal: abortSignal,
                  }),
                  toolNames: (activeAgent as Agent<AgentContext>).tools.map((tool) => tool.name),
                  agent: activeAgent as Agent<AgentContext>,
                }
              : await runtime.runChatTurn({
                  chatId,
                  input,
                  preferredModelId: transportOptions.preferredModelId,
                  context: transportOptions.context,
                  attachments: transportOptions.attachments,
                  mode: transportOptions.mode,
                  session,
                  signal: abortSignal,
                });

            if (!activeAgent) {
              activeAgent = agent as Agent<AgentContext>;
            }

            const approvalGate = createApprovalGate({
              chatId,
              state: result.state as RunState<AgentContext, Agent<AgentContext>>,
            });

            for await (const event of result) {
              if (abortSignal?.aborted) {
                break;
              }

              // 处理工具事件
              if (isRunItemStreamEvent(event)) {
                if (event.name === 'tool_approval_requested') {
                  const approvalItem = event.item as RunToolApprovalItem;
                  const toolCallId = resolveToolCallId(approvalItem);
                  const approvalId = registerApprovalRequest(approvalGate, {
                    toolCallId,
                    item: approvalItem,
                  });
                  controller.enqueue({
                    type: 'tool-approval-request',
                    approvalId,
                    toolCallId,
                  });
                  continue;
                }

                if (__DEV__) {
                  logToolEvent(event);
                }
                const chunk = mapRunToolEventToChunk(event, toolNames, generateUUID);
                if (__DEV__) {
                  logger.debug('Tool chunk:', chunk ? JSON.stringify(chunk).slice(0, 200) : 'null');
                }
                if (chunk) {
                  controller.enqueue(chunk);
                }
                continue;
              }

              // 处理 Model 流事件
              if (isRunRawModelStreamEvent(event)) {
                const extracted = extractRunRawModelStreamEvent(event.data);

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
              reasoningStarted = false;
            }
            if (textStarted) {
              controller.enqueue({ type: 'text-end', id: textMessageId });
              textStarted = false;
            }

            await result.completed;

            if (resumedState) {
              const outputItems = result.output;
              if (outputItems.length > 0) {
                await session.addItems(outputItems);
              }
            }

            if (abortSignal?.aborted) {
              clearApprovalGate(chatId);
              break;
            }

            if (hasPendingApprovals(approvalGate)) {
              await waitForApprovals(approvalGate);
              clearApprovalGate(chatId);
              if (abortSignal?.aborted) {
                break;
              }
              resumedState = result.state as RunState<AgentContext, Agent<AgentContext>>;
              continue;
            }

            clearApprovalGate(chatId);
            resumedState = null;
            break;
          }

          controller.enqueue({ type: 'finish', finishReason: 'stop' });
          controller.close();
          closed = true;
        } catch (error) {
          if (abortSignal?.aborted || isAbortError(error)) {
            if (!closed) {
              controller.enqueue({ type: 'finish', finishReason: 'stop' });
              controller.close();
              closed = true;
            }
            return;
          }
          controller.error(error);
          closed = true;
        } finally {
          clearApprovalGate(chatId);
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
 * 记录工具事件详情（仅开发环境使用）
 */
function logToolEvent(itemEvent: RunItemStreamEventLike): void {
  const itemObj = itemEvent.item as { type?: string; constructor?: { name?: string } };
  logger.debug('Tool event:', {
    name: itemEvent.name,
    itemType: itemObj?.type,
    itemCtor: itemObj?.constructor?.name,
  });
}

const isAbortError = (error: unknown): boolean => {
  if (!error) return false;
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  return error instanceof Error && error.name === 'AbortError';
};
