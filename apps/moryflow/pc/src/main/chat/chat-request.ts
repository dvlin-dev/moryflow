/**
 * [INPUT]: ChatRequestPayload - IPC 聊天请求负载
 * [OUTPUT]: UIMessageChunk 流 + 会话持久化更新
 * [POS]: Chat 主进程请求入口（流式处理 + 持久化）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { createUIMessageStream, type UIMessage, type UIMessageChunk } from 'ai';
import type { IpcMainInvokeEvent } from 'electron';

import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { AgentChatRequestOptions, TokenUsage } from '../../shared/ipc.js';
import { run, type Agent, type RunState, type RunToolApprovalItem } from '@openai/agents-core';
import { processAttachments } from './attachments.js';
import { normalizeAgentOptions } from './agent-options.js';
import { broadcastMessageEvent, broadcastSessionEvent } from './broadcast.js';
import {
  findLatestUserMessage,
  extractUserAttachments,
  extractUserText,
  streamAgentRun,
} from './messages.js';
import { sanitizePersistedUiMessages } from './ui-message-sanitizer.js';
import { getRuntime } from './runtime.js';
import { writeErrorResponse } from './tool-calls.js';
import { chatSessionStore } from '../chat-session-store/index.js';
import { createChatSession, runWithRuntimeVaultRoot } from '../agent-runtime/index.js';
import { getGlobalPermissionMode } from '../agent-runtime/runtime-config.js';
import {
  createApprovalGate,
  registerApprovalRequest,
  waitForApprovals,
  hasPendingApprovals,
  clearApprovalGate,
} from './approval-store.js';
import {
  DEFAULT_AUTO_CONTINUE_CONFIG,
  annotateLatestAssistantRoundMetadata,
  shouldContinueForTruncation,
  buildTruncateContinuePrompt,
  type AgentContext,
} from '@moryflow/agents-runtime';
import { isChatDebugEnabled, logChatDebug } from '../chat-debug-log.js';
import { createRuntimeTaskStateService } from '../agent-runtime/task-state-runtime.js';

type ChatSessionStream = {
  sessionId: string;
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

const summarizeThinkingProfile = (profile?: AgentChatRequestOptions['thinkingProfile']) => {
  if (!profile) {
    return undefined;
  }
  return {
    supportsThinking: profile.supportsThinking,
    defaultLevel: profile.defaultLevel,
    levels: profile.levels.map((level) => ({
      id: level.id,
      label: level.label,
      visibleParams: level.visibleParams ?? [],
    })),
  };
};

export const createChatRequestHandler = (sessions: Map<string, ChatSessionStream>) => {
  return async (event: IpcMainInvokeEvent, payload: ChatRequestPayload | null | undefined) => {
    const { chatId, channel, messages } = payload ?? {};
    const agentOptions = normalizeAgentOptions(payload?.agentOptions);
    if (!chatId || !channel || !Array.isArray(messages)) {
      throw new Error('聊天请求参数不完整');
    }
    const sessionSummary = chatSessionStore.getSummary(chatId);
    const sessionVaultPath = sessionSummary.vaultPath.trim();
    if (!path.isAbsolute(sessionVaultPath)) {
      throw new Error('This thread has invalid workspace scope. Please create a new thread.');
    }
    const preferredModelId = agentOptions?.preferredModelId ?? sessionSummary.preferredModelId;
    const thinking = agentOptions?.thinking;
    const globalMode = await getGlobalPermissionMode();
    if (thinking) {
      console.debug('[chat] thinking selection resolved', {
        chatId,
        preferredModelId,
        thinking,
      });
    }
    if (isChatDebugEnabled()) {
      logChatDebug('chat.request.received', {
        chatId,
        channel,
        preferredModelId,
        thinking,
        thinkingProfile: summarizeThinkingProfile(agentOptions?.thinkingProfile),
        messageCount: messages.length,
        sessionMode: globalMode,
      });
    }

    const latestUserMessage = findLatestUserMessage(messages);
    if (!latestUserMessage) {
      throw new Error('无法获取用户输入内容');
    }
    const userInput = extractUserText(latestUserMessage);
    const { textContexts: attachmentContexts, images } = await processAttachments(
      extractUserAttachments(latestUserMessage)
    );
    if (!userInput && images.length === 0) {
      throw new Error('Message must contain text or images');
    }

    const abortController = new AbortController();
    const session = createChatSession(chatId);
    const config = DEFAULT_AUTO_CONTINUE_CONFIG;

    // 累积整个请求的 token 使用量
    const requestUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let roundStartedAt: number | undefined;

    const stream = createUIMessageStream<UIMessage>({
      originalMessages: messages,
      async execute({ writer }) {
        const runtimeInstance = getRuntime();

        // 截断续写计数
        let truncateContinueCount = 0;
        let currentInput = userInput ?? '';
        let resumedState: RunState<AgentContext, Agent<AgentContext>> | null = null;
        let activeAgent: Agent<AgentContext> | null = null;

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
          await runWithRuntimeVaultRoot(sessionVaultPath, async () => {
            // 自动续写循环（仅处理输出截断）
            while (true) {
              if (abortController.signal.aborted) {
                break;
              }

              const { result, toolNames, agent, thinkingResolution } = resumedState
                ? {
                    result: await run(activeAgent as Agent<AgentContext>, resumedState, {
                      stream: true,
                      signal: abortController.signal,
                    }),
                    toolNames: (activeAgent as Agent<AgentContext>).tools.map((tool) => tool.name),
                    agent: activeAgent as Agent<AgentContext>,
                    thinkingResolution: undefined,
                  }
                : await runtimeInstance.runChatTurn({
                    chatId,
                    input: currentInput,
                    preferredModelId,
                    thinking,
                    thinkingProfile: agentOptions?.thinkingProfile,
                    context: agentOptions?.context,
                    selectedSkillName: agentOptions?.selectedSkill?.name,
                    session,
                    attachments: attachmentContexts,
                    images,
                    mode: globalMode,
                    signal: abortController.signal,
                  });

              if (isChatDebugEnabled()) {
                logChatDebug('chat.run.turn.started', {
                  chatId,
                  resumed: Boolean(resumedState),
                  preferredModelId,
                  toolCount: toolNames.length,
                  thinking,
                  thinkingProfile: summarizeThinkingProfile(agentOptions?.thinkingProfile),
                });
              }

              if (!activeAgent) {
                activeAgent = agent as Agent<AgentContext>;
              }

              const approvalGate = createApprovalGate({
                channel,
                sessionId: chatId,
                state: result.state as RunState<AgentContext, Agent<AgentContext>>,
              });

              // 流式处理并提取 finishReason 和 usage
              const streamResult = await streamAgentRun({
                writer,
                result,
                toolNames,
                signal: abortController.signal,
                onFirstRenderableAssistantChunk: () => {
                  roundStartedAt ??= Date.now();
                },
                onToolApprovalRequest: (item) => {
                  const toolCallId = resolveToolCallId(item);
                  const approvalId = registerApprovalRequest(approvalGate, {
                    toolCallId,
                    item,
                  });
                  if (!approvalId) {
                    return null;
                  }
                  return {
                    approvalId,
                    toolCallId,
                  };
                },
                thinkingContext: thinkingResolution,
              });

              if (isChatDebugEnabled()) {
                logChatDebug('chat.run.turn.completed', {
                  chatId,
                  resumed: Boolean(resumedState),
                  finishReason: streamResult.finishReason ?? 'unknown',
                  usage: streamResult.usage ?? null,
                });
              }

              // 累积 usage
              if (streamResult.usage) {
                requestUsage.promptTokens += streamResult.usage.promptTokens;
                requestUsage.completionTokens += streamResult.usage.completionTokens;
                requestUsage.totalTokens += streamResult.usage.totalTokens;
              }

              // 手动追加续跑输出（首次运行由 runtime 负责持久化）
              if (resumedState) {
                const outputItems = result.output;
                if (outputItems.length > 0) {
                  await session.addItems(outputItems);
                }
              }

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
                // 清空附件，续写时不需要重复发送
                attachmentContexts.length = 0;
                images.length = 0;
                continue;
              }

              // 不需要续写，退出循环
              break;
            }
          });
        } catch (error) {
          console.error('[chat] runChatTurn failed', error);
          if (isChatDebugEnabled()) {
            logChatDebug('chat.run.error', {
              chatId,
              preferredModelId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          if (abortController.signal.aborted) {
            return;
          }
          writeErrorResponse(writer, error instanceof Error ? error.message : String(error));
        } finally {
          clearApprovalGate(channel);
        }
      },
      onFinish: async ({ messages: nextMessages }) => {
        try {
          const roundAnnotated = annotateLatestAssistantRoundMetadata(nextMessages, {
            startedAt: roundStartedAt,
            finishedAt: Date.now(),
          });
          const sanitizedMessages = sanitizePersistedUiMessages(roundAnnotated.messages);
          const hasUsage = requestUsage.totalTokens > 0;
          const summary = chatSessionStore.updateSessionMeta(chatId, {
            uiMessages: sanitizedMessages,
            preferredModelId,
            thinking,
            thinkingProfile: agentOptions?.thinkingProfile,
            tokenUsage: hasUsage ? requestUsage : undefined,
          });
          broadcastSessionEvent({ type: 'updated', session: summary });

          // Auto-clear taskState when all items are done (via taskStateService single write entry point)
          if (
            summary.taskState &&
            summary.taskState.items.length > 0 &&
            summary.taskState.items.every((item) => item.status === 'done')
          ) {
            await createRuntimeTaskStateService().clearDone(chatId);
          }

          broadcastMessageEvent({
            type: 'snapshot',
            sessionId: chatId,
            messages: sanitizedMessages,
            persisted: true,
          });
        } catch (error) {
          console.error('[chat] failed to persist chat session', error);
        }
      },
      onError: (error) => String(error),
    });

    sessions.set(channel, {
      sessionId: chatId,
      stream,
      cancel: async () => {
        abortController.abort();
        try {
          await stream.cancel('aborted');
        } catch {
          // ignore
        }
      },
    });
    const reader = stream.getReader();

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

    return { ok: true };
  };
};
