/**
 * [PROVIDES]: Tool 输出截断与包装工具
 * [DEPENDS]: @openai/agents-core
 * [POS]: Agent Runtime 控制面（Truncation）统一后处理层
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { FunctionTool, RunContext, Tool } from '@openai/agents-core';
import type { AgentContext } from './types';

export interface ToolOutputTruncationConfig {
  maxLines: number;
  maxBytes: number;
  ttlDays: number;
}

export interface ToolOutputStorageWriteInput {
  content: string;
  toolName?: string;
  runContext?: RunContext<AgentContext>;
}

export interface ToolOutputStorageWriteResult {
  fullPath: string;
}

export interface ToolOutputStorage {
  write: (input: ToolOutputStorageWriteInput) => Promise<ToolOutputStorageWriteResult>;
  cleanup?: () => Promise<void>;
}

export interface TruncatedToolOutput {
  kind: 'truncated_output';
  truncated: true;
  preview: string;
  fullPath: string;
  hint: string;
  metadata: {
    lines: number;
    bytes: number;
    maxLines: number;
    maxBytes: number;
  };
}

export interface ToolOutputPostProcessorOptions {
  toolName?: string;
  runContext?: RunContext<AgentContext>;
}

export type ToolOutputPostProcessor = (
  output: unknown,
  options?: ToolOutputPostProcessorOptions
) => Promise<unknown>;

export const DEFAULT_TOOL_OUTPUT_TRUNCATION: ToolOutputTruncationConfig = {
  maxLines: 2000,
  maxBytes: 50 * 1024,
  ttlDays: 7,
};

type HintBuilder = (input: {
  fullPath: string;
  toolName?: string;
  runContext?: RunContext<AgentContext>;
}) => string;

const TOOL_WRAPPED = Symbol('tool-output-truncation');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isTruncatedToolOutput = (value: unknown): value is TruncatedToolOutput => {
  if (!isRecord(value)) return false;
  return value.kind === 'truncated_output' && value.truncated === true;
};

const encodeByteLength = (value: string): number => {
  return encodeURIComponent(value).replace(/%[A-F\d]{2}/gi, '_').length;
};

const sliceByBytes = (value: string, maxBytes: number): string => {
  if (encodeByteLength(value) <= maxBytes) return value;
  let bytes = 0;
  let result = '';
  for (const char of value) {
    const nextBytes = encodeByteLength(char);
    if (bytes + nextBytes > maxBytes) break;
    bytes += nextBytes;
    result += char;
  }
  return result;
};

const safeStringify = (value: unknown): string => {
  const seen = new WeakSet<object>();
  try {
    const json = JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'bigint') return val.toString();
        if (val instanceof Error) {
          return {
            name: val.name,
            message: val.message,
            stack: val.stack,
          };
        }
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) {
            return '[Circular]';
          }
          seen.add(val);
        }
        return val;
      },
      2
    );
    return typeof json === 'string' ? json : String(value);
  } catch {
    return String(value);
  }
};

const serializeToolOutput = (output: unknown): string => {
  if (typeof output === 'string') return output;
  if (typeof output === 'number' || typeof output === 'boolean' || typeof output === 'bigint') {
    return String(output);
  }
  if (output === null || output === undefined) return '';
  return safeStringify(output);
};

const truncateText = (
  value: string,
  config: ToolOutputTruncationConfig
): { preview: string; truncated: boolean; lines: number; bytes: number } => {
  const lines = value.split(/\r?\n/);
  const lineCount = lines.length;
  const byteCount = encodeByteLength(value);

  let preview = value;
  let truncated = false;

  if (lineCount > config.maxLines) {
    preview = lines.slice(0, config.maxLines).join('\n');
    truncated = true;
  }

  const previewBytes = encodeByteLength(preview);
  if (previewBytes > config.maxBytes) {
    preview = sliceByBytes(preview, config.maxBytes);
    truncated = true;
  } else if (!truncated && byteCount > config.maxBytes) {
    preview = sliceByBytes(value, config.maxBytes);
    truncated = true;
  }

  return { preview, truncated, lines: lineCount, bytes: byteCount };
};

export const createToolOutputPostProcessor = (input: {
  config: ToolOutputTruncationConfig;
  storage: ToolOutputStorage;
  buildHint: HintBuilder;
}): ToolOutputPostProcessor => {
  const { config, storage, buildHint } = input;

  return async (output: unknown, options?: ToolOutputPostProcessorOptions) => {
    if (output === null || output === undefined) {
      return output;
    }
    if (isTruncatedToolOutput(output)) {
      return output;
    }

    const serialized = serializeToolOutput(output);
    const result = truncateText(serialized, config);

    if (!result.truncated) {
      return output;
    }

    let fullPath = '';
    let hint = '';

    try {
      const stored = await storage.write({
        content: serialized,
        toolName: options?.toolName,
        runContext: options?.runContext,
      });
      fullPath = stored.fullPath;
      hint = buildHint({
        fullPath,
        toolName: options?.toolName,
        runContext: options?.runContext,
      });
    } catch (error) {
      console.warn('[tool-output] failed to persist truncated output', error);
      hint = 'Full output could not be saved. Please retry the command if needed.';
    }

    if (fullPath && storage.cleanup) {
      try {
        await storage.cleanup();
      } catch (error) {
        console.warn('[tool-output] cleanup failed', error);
      }
    }

    const truncatedOutput: TruncatedToolOutput = {
      kind: 'truncated_output',
      truncated: true,
      preview: result.preview,
      fullPath,
      hint,
      metadata: {
        lines: result.lines,
        bytes: result.bytes,
        maxLines: config.maxLines,
        maxBytes: config.maxBytes,
      },
    };

    return truncatedOutput;
  };
};

export const wrapToolWithOutputTruncation = (
  tool: Tool<AgentContext>,
  postProcess: ToolOutputPostProcessor
): Tool<AgentContext> => {
  if ((tool as Tool<AgentContext> & Record<symbol, boolean>)[TOOL_WRAPPED]) {
    return tool;
  }

  if (tool.type !== 'function') {
    throw new Error(
      `[tool-output] Unsupported tool type: ${tool.type}. Only function tools can be truncated.`
    );
  }

  const wrapped: FunctionTool<AgentContext> = {
    ...tool,
    async invoke(runContext, input, details) {
      const output = await tool.invoke(runContext, input, details);
      return postProcess(output, { toolName: tool.name, runContext });
    },
  };

  Object.defineProperty(wrapped, TOOL_WRAPPED, {
    value: true,
    enumerable: false,
  });

  return wrapped;
};

export const wrapToolsWithOutputTruncation = (
  tools: Tool<AgentContext>[],
  postProcess: ToolOutputPostProcessor
): Tool<AgentContext>[] => tools.map((tool) => wrapToolWithOutputTruncation(tool, postProcess));
