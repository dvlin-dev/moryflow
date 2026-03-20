/**
 * [PROVIDES]: Tool streaming wrapper
 * [DEPENDS]: @openai/agents-core, types/tool-stream
 * [POS]: 共享 runtime 的 tool invoke 包装层
 *
 * [PROTOCOL]: 仅在 RunContext 注入策略或 tool streaming 契约变化时更新。
 */

import type { RunContext, FunctionTool, Tool } from '@openai/agents-core';
import type { AgentContext } from './types';

const TOOL_STREAM_WRAPPED = Symbol('tool-stream');

type ForkableRunContext<TContext> = RunContext<TContext> & {
  _forkWithToolInput?: (toolInput: unknown) => RunContext<TContext>;
  _forkWithoutToolInput?: () => RunContext<TContext>;
};

const resolveToolCallId = (tool: Tool<AgentContext>, details: unknown): string => {
  const toolCall = (details as { toolCall?: { callId?: string } } | undefined)?.toolCall;
  if (typeof toolCall?.callId === 'string' && toolCall.callId.length > 0) {
    return toolCall.callId;
  }
  return `${tool.name}:${Date.now()}`;
};

const forkRunContextWithToolStream = (
  runContext: RunContext<AgentContext>,
  toolStream: AgentContext['toolStream']
): RunContext<AgentContext> => {
  if (!toolStream) {
    return runContext;
  }

  const forkable = runContext as ForkableRunContext<AgentContext>;
  let nextRunContext: RunContext<AgentContext>;

  if (typeof forkable._forkWithToolInput === 'function') {
    nextRunContext =
      typeof runContext.toolInput !== 'undefined'
        ? forkable._forkWithToolInput(runContext.toolInput)
        : typeof forkable._forkWithoutToolInput === 'function'
          ? forkable._forkWithoutToolInput()
          : forkable._forkWithToolInput(undefined);
  } else if (typeof forkable._forkWithoutToolInput === 'function') {
    nextRunContext = forkable._forkWithoutToolInput();
  } else {
    throw new Error(
      '[tool-stream] RunContext fork helpers are unavailable. Update the wrapper for the current SDK.'
    );
  }

  nextRunContext.context = {
    ...runContext.context,
    toolStream,
  };

  return nextRunContext;
};

export const wrapToolWithStreaming = (tool: Tool<AgentContext>): Tool<AgentContext> => {
  if ((tool as Tool<AgentContext> & Record<symbol, boolean>)[TOOL_STREAM_WRAPPED]) {
    return tool;
  }

  if (tool.type !== 'function') {
    return tool;
  }

  const wrapped: FunctionTool<AgentContext> = {
    ...tool,
    async invoke(runContext, input, details) {
      const createHandle = runContext.context.createToolStreamHandle;
      if (!createHandle) {
        return tool.invoke(runContext, input, details);
      }

      const toolCallId = resolveToolCallId(tool, details);
      const toolStream = createHandle({
        toolCallId,
        toolName: tool.name,
      });
      const nextRunContext = forkRunContextWithToolStream(runContext, toolStream);
      return tool.invoke(nextRunContext, input, details);
    },
  };

  Object.defineProperty(wrapped, TOOL_STREAM_WRAPPED, {
    value: true,
    enumerable: false,
  });

  return wrapped;
};

export const wrapToolsWithStreaming = (tools: Tool<AgentContext>[]): Tool<AgentContext>[] =>
  tools.map((tool) => wrapToolWithStreaming(tool));
