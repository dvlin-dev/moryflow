import { createUIMessageStream, type UIMessage, type UIMessageChunk } from 'ai';
import type { IpcMainInvokeEvent } from 'electron';

import { randomUUID } from 'node:crypto';
import type { AgentChatRequestOptions, TokenUsage } from '../../shared/ipc.js';
import { run, type Agent, type RunState, type RunToolApprovalItem } from '@openai/agents-core';
import { buildAttachmentContexts } from './attachments.js';
import { normalizeAgentOptions } from './agent-options.js';
import { broadcastSessionEvent } from './broadcast.js';
import {
  findLatestUserMessage,
  extractUserAttachments,
  extractUserText,
  collectUiMessages,
  streamAgentRun,
} from './messages.js';
import { getRuntime } from './runtime.js';
import { writeErrorResponse } from './tool-calls.js';
import { chatSessionStore } from '../chat-session-store/index.js';
import { createChatSession } from '../agent-runtime/index.js';
import {
  createApprovalGate,
  registerApprovalRequest,
  waitForApprovals,
  hasPendingApprovals,
  clearApprovalGate,
} from './approval-store.js';
import {
  DEFAULT_AUTO_CONTINUE_CONFIG,
  shouldContinueForTruncation,
  buildTruncateContinuePrompt,
  type AgentContext,
} from '@anyhunt/agents-runtime';

type ChatSessionStream = {
  stream: ReadableStream<UIMessageChunk>;
  cancel: () => Promise<void> | void;
};

/** 聊天请求的 IPC payload */
type ChatRequestPayload = {
  chatId?: string;
  channel?: string;
  messages?: UIMessage[];
  agentOptions?: AgentChatRequestOptions;
};

export const createChatRequestHandler = (sessions: Map<string, ChatSessionStream>) => {
  return async (event: IpcMainInvokeEvent, payload: ChatRequestPayload | null | undefined) => {
    const { chatId, channel, messages } = payload ?? {};
    const agentOptions = normalizeAgentOptions(payload?.agentOptions);
    if (!chatId || !channel || !Array.isArray(messages)) {
      throw new Error('聊天请求参数不完整');
    }
    const sessionSummary = chatSessionStore.getSummary(chatId);
    const preferredModelId = agentOptions?.preferredModelId ?? sessionSummary.preferredModelId;

    const latestUserMessage = findLatestUserMessage(messages);
    if (!latestUserMessage) {
      throw new Error('无法获取用户输入内容');
    }
    const userInput = extractUserText(latestUserMessage);
    if (!userInput) {
      throw new Error('无法获取用户输入内容');
    }
    const attachmentContexts = await buildAttachmentContexts(
      extractUserAttachments(latestUserMessage)
    );

    const abortController = new AbortController();
    const session = createChatSession(chatId);
    const config = DEFAULT_AUTO_CONTINUE_CONFIG;

    // 累积整个请求的 token 使用量
    const requestUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    const stream = createUIMessageStream<UIMessage>({
      originalMessages: messages,
      async execute({ writer }) {
        const runtimeInstance = getRuntime();

        // 截断续写计数
        let truncateContinueCount = 0;
        let currentInput = userInput;
        let resumedState: RunState<AgentContext, Agent<AgentContext>> | null = null;
        let activeAgent: Agent<AgentContext> | null = null;
        let persistedOutputCount = 0;

        const resolveToolCallId = (item: RunToolApprovalItem): string => {
          const raw = item.rawItem as Record<string, unknown> | undefined;
          const callId =
            typeof raw?.callId === 'string' && raw.callId.length > 0 ? raw.callId : undefined;
          const rawId = typeof raw?.id === 'string' && raw.id.length > 0 ? raw.id : undefined;
          const providerData = raw?.providerData as Record<string, unknown> | undefined;
          const providerId =
            typeof providerData?.id === 'string' && providerData.id.length > 0
              ? providerData.id
              : undefined;
          return callId ?? rawId ?? providerId ?? randomUUID();
        };

        try {
          // 自动续写循环（仅处理输出截断）
          while (true) {
            if (abortController.signal.aborted) {
              break;
            }

            const { result, toolNames, agent } = resumedState
              ? {
                  result: await run(activeAgent as Agent<AgentContext>, resumedState, {
                    stream: true,
                    signal: abortController.signal,
                  }),
                  toolNames: (activeAgent as Agent<AgentContext>).tools.map((tool) => tool.name),
                  agent: activeAgent as Agent<AgentContext>,
                }
              : await runtimeInstance.runChatTurn({
                  chatId,
                  input: currentInput,
                  preferredModelId,
                  context: agentOptions?.context,
                  session,
                  attachments: attachmentContexts,
                  signal: abortController.signal,
                });

            if (!activeAgent) {
              activeAgent = agent as Agent<AgentContext>;
            }

            const approvalGate = createApprovalGate({
              channel,
              state: result.state as RunState<AgentContext, Agent<AgentContext>>,
            });

            // 流式处理并提取 finishReason 和 usage
            const streamResult = await streamAgentRun({
              writer,
              result,
              toolNames,
              signal: abortController.signal,
              onToolApprovalRequest: (item) => {
                const toolCallId = resolveToolCallId(item);
                return {
                  approvalId: registerApprovalRequest(approvalGate, {
                    toolCallId,
                    item,
                  }),
                  toolCallId,
                };
              },
            });

            // 累积 usage
            if (streamResult.usage) {
              requestUsage.promptTokens += streamResult.usage.promptTokens;
              requestUsage.completionTokens += streamResult.usage.completionTokens;
              requestUsage.totalTokens += streamResult.usage.totalTokens;
            }

            // 手动追加续跑输出（首次运行由 runtime 负责持久化）
            if (resumedState) {
              const outputItems = result.output.slice(persistedOutputCount);
              if (outputItems.length > 0) {
                await session.addItems(outputItems);
              }
            }
            persistedOutputCount = result.output.length;

            // 检查是否被中断
            if (abortController.signal.aborted) {
              clearApprovalGate(channel);
              break;
            }

            if (hasPendingApprovals(approvalGate)) {
              await waitForApprovals(approvalGate);
              clearApprovalGate(channel);
              if (abortController.signal.aborted) {
                break;
              }
              resumedState = result.state as RunState<AgentContext, Agent<AgentContext>>;
              continue;
            }
            clearApprovalGate(channel);
            resumedState = null;

            // 检查是否需要截断续写
            if (
              shouldContinueForTruncation(streamResult.finishReason, config) &&
              truncateContinueCount < config.maxTruncateContinues
            ) {
              truncateContinueCount++;
              currentInput = buildTruncateContinuePrompt();
              console.log(`[chat] 截断续写 #${truncateContinueCount}`);
              // 清空附件，续写时不需要重复发送
              attachmentContexts.length = 0;
              continue;
            }

            // 不需要续写，退出循环
            break;
          }
        } catch (error) {
          console.error('[chat] runChatTurn failed', error);
          if (abortController.signal.aborted) {
            return;
          }
          writeErrorResponse(writer, error instanceof Error ? error.message : String(error));
        } finally {
          clearApprovalGate(channel);
        }
      },
      onError: (error) => String(error),
    });

    const [rendererStream, storageStream] = stream.tee();
    const persistedMessagesPromise = collectUiMessages(messages, storageStream);

    sessions.set(channel, {
      stream: rendererStream,
      cancel: async () => {
        abortController.abort();
        try {
          await rendererStream.cancel('aborted');
        } catch {
          // ignore
        }
      },
    });
    const reader = rendererStream.getReader();

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          event.sender.send(channel, value);
        }
      } catch (error) {
        console.error('[chat] reader error:', error);
        event.sender.send(channel, { type: 'error', errorText: String(error) });
      } finally {
        event.sender.send(channel, null);
        sessions.delete(channel);
      }
    })();

    void (async () => {
      try {
        const uiMessages = await persistedMessagesPromise;
        // 仅当有 token 使用时才传递 usage
        const hasUsage = requestUsage.totalTokens > 0;
        const summary = chatSessionStore.updateSessionMeta(chatId, {
          uiMessages,
          preferredModelId,
          tokenUsage: hasUsage ? requestUsage : undefined,
        });
        broadcastSessionEvent({ type: 'updated', session: summary });
      } catch (error) {
        console.error('[chat] failed to persist chat session', error);
      }
    })();

    return { ok: true };
  };
};
