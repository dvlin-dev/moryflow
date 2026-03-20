import { describe, expect, it, vi } from 'vitest';
import { RunContext, type FunctionTool } from '@openai/agents-core';
import type { AgentContext } from '../types';
import type { ToolStreamHandle } from '../tool-stream';
import { wrapToolsWithStreaming } from '../tool-stream-wrapper';

describe('tool-stream-wrapper', () => {
  it('injects a stable toolStream handle into the current tool invocation', async () => {
    const emitted: unknown[] = [];
    const createToolStreamHandle = vi.fn<NonNullable<AgentContext['createToolStreamHandle']>>(
      ({ toolCallId, toolName }) => ({
        toolCallId,
        toolName,
        emit: (event: Parameters<ToolStreamHandle['emit']>[0]) => emitted.push(event),
      })
    );

    const tool: FunctionTool<AgentContext> = {
      type: 'function' as const,
      name: 'bash',
      description: 'bash',
      parameters: {} as never,
      strict: false,
      needsApproval: async () => false,
      isEnabled: async () => true,
      async invoke(runContext: RunContext<AgentContext>) {
        runContext.context.toolStream?.emit({
          kind: 'progress',
          message: 'running',
          startedAt: 100,
          timestamp: 150,
        } as Parameters<ToolStreamHandle['emit']>[0]);
        return {
          ok: true,
          toolCallId: runContext.context.toolStream?.toolCallId,
        };
      },
    };

    const [wrapped] = wrapToolsWithStreaming([tool]);
    if (wrapped.type !== 'function') {
      throw new Error('Expected function tool');
    }
    const result = await wrapped.invoke(
      new RunContext<AgentContext>({
        chatId: 'chat-1',
        vaultRoot: '/vault',
        createToolStreamHandle,
      }),
      JSON.stringify({ command: 'pwd' }),
      {
        toolCall: {
          callId: 'call-1',
          name: 'bash',
          arguments: { command: 'pwd' },
        },
      } as never
    );

    expect(createToolStreamHandle).toHaveBeenCalledWith({
      toolCallId: 'call-1',
      toolName: 'bash',
    });
    expect(emitted).toEqual([
      {
        kind: 'progress',
        message: 'running',
        startedAt: 100,
        timestamp: 150,
      },
    ]);
    expect(result).toEqual({
      ok: true,
      toolCallId: 'call-1',
    });
  });

  it('does not change tools when no stream handle factory is configured', async () => {
    const tool: FunctionTool<AgentContext> = {
      type: 'function' as const,
      name: 'echo',
      description: 'echo',
      parameters: {} as never,
      strict: false,
      needsApproval: async () => false,
      isEnabled: async () => true,
      async invoke(runContext: RunContext<AgentContext>) {
        return {
          hasToolStream: Boolean(runContext.context.toolStream),
        };
      },
    };

    const [wrapped] = wrapToolsWithStreaming([tool]);
    if (wrapped.type !== 'function') {
      throw new Error('Expected function tool');
    }
    const result = await wrapped.invoke(
      new RunContext<AgentContext>({
        chatId: 'chat-1',
        vaultRoot: '/vault',
      }),
      '{}'
    );

    expect(result).toEqual({
      hasToolStream: false,
    });
  });

  it('preserves runContext approval state when injecting toolStream', async () => {
    const tool: FunctionTool<AgentContext> = {
      type: 'function' as const,
      name: 'bash',
      description: 'bash',
      parameters: {} as never,
      strict: false,
      needsApproval: async () => false,
      isEnabled: async () => true,
      async invoke(runContext: RunContext<AgentContext>) {
        return {
          approved: runContext.isToolApproved({
            toolName: 'bash',
            callId: 'call-1',
          }),
        };
      },
    };

    const [wrapped] = wrapToolsWithStreaming([tool]);
    if (wrapped.type !== 'function') {
      throw new Error('Expected function tool');
    }

    const runContext = new RunContext<AgentContext>({
      chatId: 'chat-1',
      vaultRoot: '/vault',
      createToolStreamHandle: ({ toolCallId, toolName }) => ({
        toolCallId,
        toolName,
        emit: () => {},
      }),
    });
    runContext.approveTool({
      toolName: 'bash',
      rawItem: {
        callId: 'call-1',
        name: 'bash',
      },
    } as never);

    const result = await wrapped.invoke(runContext, JSON.stringify({ command: 'pwd' }), {
      toolCall: {
        callId: 'call-1',
        name: 'bash',
        arguments: { command: 'pwd' },
      },
    } as never);

    expect(result).toEqual({
      approved: true,
    });
  });
});
