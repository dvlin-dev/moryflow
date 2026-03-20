import { randomUUID } from 'node:crypto';
import type { UIMessage, UIMessageStreamWriter } from 'ai';
import type { ToolRuntimeStreamEvent } from '@moryflow/agents-runtime';
import { run, type Agent, type RunState, type RunToolApprovalItem } from '@openai/agents-core';
import type { AgentChatRequestOptions, TokenUsage } from '../../../shared/ipc.js';
import { createChatSession, runWithRuntimeVaultRoot } from '../../agent-runtime/index.js';
import {
  DEFAULT_AUTO_CONTINUE_CONFIG,
  buildTruncateContinuePrompt,
  shouldContinueForTruncation,
  type AgentContext,
} from '@moryflow/agents-runtime';
import { isChatDebugEnabled, logChatDebug } from '../../chat/debug/logger.js';
import { getRuntime } from '../services/runtime.js';
import {
  clearApprovalGate,
  createApprovalGate,
  hasPendingApprovals,
  registerApprovalRequest,
  waitForApprovals,
} from '../services/approval/approval-gate-store.js';
import { createToolRuntimeEventQueue } from '../stream/coordinator.js';
import { streamAgentRun } from '../stream/streamAgentRun.js';
import { writeErrorResponse } from './writeErrorResponse.js';

const resolveToolCallId = (item: RunToolApprovalItem): string => {
  const raw = item.rawItem as Record<string, unknown> | undefined;
  const callId = typeof raw?.callId === 'string' && raw.callId.length > 0 ? raw.callId : undefined;
  const rawId = typeof raw?.id === 'string' && raw.id.length > 0 ? raw.id : undefined;
  const providerData = raw?.providerData as Record<string, unknown> | undefined;
  const providerId =
    typeof providerData?.id === 'string' && providerData.id.length > 0
      ? providerData.id
      : undefined;
  return callId ?? rawId ?? providerId ?? randomUUID();
};

export const executeChatTurn = async (input: {
  chatId: string;
  channel: string;
  writer: UIMessageStreamWriter<UIMessage>;
  sessionVaultPath: string;
  preferredModelId?: string;
  thinking?: AgentChatRequestOptions['thinking'];
  agentOptions: AgentChatRequestOptions | undefined;
  globalMode: 'ask' | 'full_access';
  userInput: string | null;
  attachmentContexts: {
    filename?: string;
    mediaType?: string;
    content?: string;
    truncated?: boolean;
    filePath?: string;
  }[];
  images: {
    url: string;
    mediaType: string;
    filename?: string;
  }[];
  requestUsage: TokenUsage;
  roundStartedAtRef: { value?: number };
  abortController: AbortController;
}) => {
  const runtimeInstance = getRuntime();
  const session = createChatSession(input.chatId);
  const config = DEFAULT_AUTO_CONTINUE_CONFIG;

  let truncateContinueCount = 0;
  let currentInput = input.userInput ?? '';
  let resumedState: RunState<AgentContext, Agent<AgentContext>> | null = null;
  let activeAgent: Agent<AgentContext> | null = null;
  const toolStreamBridge: {
    emit?: (event: ToolRuntimeStreamEvent) => void;
  } = {};

  try {
    await runWithRuntimeVaultRoot(input.sessionVaultPath, async () => {
      while (true) {
        if (input.abortController.signal.aborted) {
          break;
        }

        const toolRuntimeEvents = createToolRuntimeEventQueue();
        toolStreamBridge.emit = (streamEvent) => {
          toolRuntimeEvents.push(streamEvent);
        };

        try {
          const { result, toolNames, agent, thinkingResolution } = resumedState
            ? {
                result: await run(activeAgent as Agent<AgentContext>, resumedState, {
                  stream: true,
                  signal: input.abortController.signal,
                }),
                toolNames: (activeAgent as Agent<AgentContext>).tools.map((tool) => tool.name),
                agent: activeAgent as Agent<AgentContext>,
                thinkingResolution: undefined,
              }
            : await runtimeInstance.runChatTurn({
                chatId: input.chatId,
                input: currentInput,
                preferredModelId: input.preferredModelId,
                thinking: input.thinking,
                thinkingProfile: input.agentOptions?.thinkingProfile,
                context: input.agentOptions?.context,
                selectedSkillName: input.agentOptions?.selectedSkill?.name,
                session,
                attachments: input.attachmentContexts,
                images: input.images,
                mode: input.globalMode,
                signal: input.abortController.signal,
                toolStreamBridge,
              });

          if (isChatDebugEnabled()) {
            logChatDebug('chat.run.turn.started', {
              chatId: input.chatId,
              resumed: Boolean(resumedState),
              preferredModelId: input.preferredModelId,
              toolCount: toolNames.length,
              thinking: input.thinking,
            });
          }

          if (!activeAgent) {
            activeAgent = agent as Agent<AgentContext>;
          }

          const approvalGate = createApprovalGate({
            channel: input.channel,
            sessionId: input.chatId,
            state: result.state as RunState<AgentContext, Agent<AgentContext>>,
          });

          const streamResult = await streamAgentRun({
            writer: input.writer,
            result,
            toolNames,
            signal: input.abortController.signal,
            onFirstRenderableAssistantChunk: () => {
              input.roundStartedAtRef.value ??= Date.now();
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
            toolRuntimeEvents,
          });

          if (isChatDebugEnabled()) {
            logChatDebug('chat.run.turn.completed', {
              chatId: input.chatId,
              resumed: Boolean(resumedState),
              finishReason: streamResult.finishReason ?? 'unknown',
              usage: streamResult.usage ?? null,
            });
          }

          if (streamResult.usage) {
            input.requestUsage.promptTokens += streamResult.usage.promptTokens;
            input.requestUsage.completionTokens += streamResult.usage.completionTokens;
            input.requestUsage.totalTokens += streamResult.usage.totalTokens;
          }

          if (resumedState) {
            const outputItems = result.output;
            if (outputItems.length > 0) {
              await session.addItems(outputItems);
            }
          }

          if (input.abortController.signal.aborted) {
            clearApprovalGate(input.channel);
            break;
          }

          if (hasPendingApprovals(approvalGate)) {
            await waitForApprovals(approvalGate);
            clearApprovalGate(input.channel);
            if (input.abortController.signal.aborted) {
              break;
            }
            resumedState = result.state as RunState<AgentContext, Agent<AgentContext>>;
            continue;
          }

          clearApprovalGate(input.channel);
          resumedState = null;

          if (
            shouldContinueForTruncation(streamResult.finishReason, config) &&
            truncateContinueCount < config.maxTruncateContinues
          ) {
            truncateContinueCount += 1;
            currentInput = buildTruncateContinuePrompt();
            input.attachmentContexts.length = 0;
            input.images.length = 0;
            continue;
          }

          break;
        } finally {
          toolStreamBridge.emit = undefined;
          toolRuntimeEvents.close();
        }
      }
    });
  } catch (error) {
    console.error('[chat] runChatTurn failed', error);
    if (isChatDebugEnabled()) {
      logChatDebug('chat.run.error', {
        chatId: input.chatId,
        preferredModelId: input.preferredModelId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    if (input.abortController.signal.aborted) {
      return;
    }
    writeErrorResponse(input.writer, error instanceof Error ? error.message : String(error));
  } finally {
    clearApprovalGate(input.channel);
  }
};
