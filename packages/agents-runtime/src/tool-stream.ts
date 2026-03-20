/**
 * [PROVIDES]: Tool 运行时增量事件与预览快照归并
 * [DEPENDS]: 无
 * [POS]: 共享 runtime 的 tool streaming 协议单源
 *
 * [PROTOCOL]: 仅在 Header 事实、事件协议或预览契约变化时更新。
 */

export type ToolRuntimeStreamEvent =
  | {
      kind: 'progress';
      toolCallId: string;
      toolName: string;
      message?: string;
      startedAt: number;
      timestamp: number;
    }
  | {
      kind: 'stdout';
      toolCallId: string;
      toolName: string;
      chunk: string;
      startedAt: number;
      timestamp: number;
    }
  | {
      kind: 'stderr';
      toolCallId: string;
      toolName: string;
      chunk: string;
      startedAt: number;
      timestamp: number;
    }
  | {
      kind: 'interrupted';
      toolCallId: string;
      toolName: string;
      reason: 'aborted' | 'window_closed' | 'runtime_disposed';
      startedAt: number;
      timestamp: number;
    };

export type ToolStreamingPreview = {
  kind: 'streaming_preview';
  presentation: 'shell' | 'status';
  status: 'running' | 'interrupted';
  summary?: string;
  command?: string;
  cwd?: string;
  stdoutPreview?: string;
  stderrPreview?: string;
  elapsedMs: number;
  bytes: {
    stdout: number;
    stderr: number;
  };
  truncated: boolean;
};

export type ToolRuntimeEmitEvent =
  | Omit<Extract<ToolRuntimeStreamEvent, { kind: 'progress' }>, 'toolCallId' | 'toolName'>
  | Omit<Extract<ToolRuntimeStreamEvent, { kind: 'stdout' }>, 'toolCallId' | 'toolName'>
  | Omit<Extract<ToolRuntimeStreamEvent, { kind: 'stderr' }>, 'toolCallId' | 'toolName'>
  | Omit<Extract<ToolRuntimeStreamEvent, { kind: 'interrupted' }>, 'toolCallId' | 'toolName'>;

export type ToolStreamHandle = {
  toolCallId: string;
  toolName: string;
  emit: (event: ToolRuntimeEmitEvent) => void;
};

type ReducerOptions = {
  maxPreviewBytes?: number;
};

type PreviewState = {
  summary?: string;
  stdoutPreview: string;
  stderrPreview: string;
  stdoutBytes: number;
  stderrBytes: number;
  truncated: boolean;
  status: 'running' | 'interrupted';
};

const DEFAULT_MAX_PREVIEW_BYTES = 64 * 1024;
const textEncoder = new TextEncoder();

const encodeByteLength = (value: string): number => {
  return textEncoder.encode(value).length;
};

const sliceTailByBytes = (value: string, maxBytes: number): string => {
  if (encodeByteLength(value) <= maxBytes) {
    return value;
  }

  let bytes = 0;
  const chars = Array.from(value);
  const result: string[] = [];
  for (let index = chars.length - 1; index >= 0; index -= 1) {
    const char = chars[index] ?? '';
    const charBytes = encodeByteLength(char);
    if (bytes + charBytes > maxBytes) {
      break;
    }
    bytes += charBytes;
    result.unshift(char);
  }
  return result.join('');
};

const appendPreviewChunk = (existing: string, chunk: string, maxPreviewBytes: number) => {
  const merged = existing + chunk;
  const truncated = encodeByteLength(merged) > maxPreviewBytes;
  return {
    preview: sliceTailByBytes(merged, maxPreviewBytes),
    truncated,
  };
};

export const isToolStreamingPreviewOutput = (value: unknown): value is ToolStreamingPreview => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return (value as { kind?: string }).kind === 'streaming_preview';
};

export const createToolStreamingPreviewReducer = (options: ReducerOptions = {}) => {
  const maxPreviewBytes = options.maxPreviewBytes ?? DEFAULT_MAX_PREVIEW_BYTES;
  const states = new Map<string, PreviewState>();

  const buildPreview = (
    state: PreviewState,
    event: ToolRuntimeStreamEvent
  ): ToolStreamingPreview => ({
    kind: 'streaming_preview',
    presentation: state.stdoutPreview || state.stderrPreview ? 'shell' : 'status',
    status: state.status,
    summary: state.summary,
    stdoutPreview: state.stdoutPreview,
    stderrPreview: state.stderrPreview,
    elapsedMs: Math.max(0, event.timestamp - event.startedAt),
    bytes: {
      stdout: state.stdoutBytes,
      stderr: state.stderrBytes,
    },
    truncated: state.truncated,
  });

  const getState = (toolCallId: string): PreviewState =>
    states.get(toolCallId) ?? {
      summary: undefined,
      stdoutPreview: '',
      stderrPreview: '',
      stdoutBytes: 0,
      stderrBytes: 0,
      truncated: false,
      status: 'running',
    };

  return {
    consume(event: ToolRuntimeStreamEvent): ToolStreamingPreview {
      const current = getState(event.toolCallId);
      let next: PreviewState = current;

      if (event.kind === 'progress') {
        next = {
          ...current,
          summary: event.message ?? current.summary,
          status: 'running',
        };
      } else if (event.kind === 'stdout') {
        const updated = appendPreviewChunk(current.stdoutPreview, event.chunk, maxPreviewBytes);
        next = {
          ...current,
          stdoutPreview: updated.preview,
          stdoutBytes: current.stdoutBytes + encodeByteLength(event.chunk),
          truncated: current.truncated || updated.truncated,
          status: 'running',
        };
      } else if (event.kind === 'stderr') {
        const updated = appendPreviewChunk(current.stderrPreview, event.chunk, maxPreviewBytes);
        next = {
          ...current,
          stderrPreview: updated.preview,
          stderrBytes: current.stderrBytes + encodeByteLength(event.chunk),
          truncated: current.truncated || updated.truncated,
          status: 'running',
        };
      } else {
        next = {
          ...current,
          status: 'interrupted',
          summary:
            current.summary ??
            (event.reason === 'aborted'
              ? 'Tool execution interrupted.'
              : 'Tool execution interrupted.'),
        };
      }

      states.set(event.toolCallId, next);
      return buildPreview(next, event);
    },
    get(toolCallId: string): ToolStreamingPreview | null {
      const state = states.get(toolCallId);
      if (!state) {
        return null;
      }
      return {
        kind: 'streaming_preview',
        presentation: state.stdoutPreview || state.stderrPreview ? 'shell' : 'status',
        status: state.status,
        summary: state.summary,
        stdoutPreview: state.stdoutPreview,
        stderrPreview: state.stderrPreview,
        elapsedMs: 0,
        bytes: {
          stdout: state.stdoutBytes,
          stderr: state.stderrBytes,
        },
        truncated: state.truncated,
      };
    },
    clear(toolCallId: string) {
      states.delete(toolCallId);
    },
  };
};
