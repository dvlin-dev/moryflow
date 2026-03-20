import { describe, expect, it } from 'vitest';
import {
  createToolStreamingPreviewReducer,
  isToolStreamingPreviewOutput,
  type ToolRuntimeStreamEvent,
} from '../tool-stream';

const createProgressEvent = (
  overrides: Partial<Extract<ToolRuntimeStreamEvent, { kind: 'progress' }>> = {}
): ToolRuntimeStreamEvent => ({
  toolCallId: 'tool-1',
  toolName: 'bash',
  kind: 'progress',
  message: 'running',
  startedAt: 1_000,
  timestamp: 1_050,
  ...overrides,
});

const createStdoutEvent = (
  overrides: Partial<Extract<ToolRuntimeStreamEvent, { kind: 'stdout' }>> = {}
): ToolRuntimeStreamEvent => ({
  toolCallId: 'tool-1',
  toolName: 'bash',
  kind: 'stdout',
  chunk: '',
  startedAt: 1_000,
  timestamp: 1_050,
  ...overrides,
});

const createInterruptedEvent = (
  overrides: Partial<Extract<ToolRuntimeStreamEvent, { kind: 'interrupted' }>> = {}
): ToolRuntimeStreamEvent => ({
  toolCallId: 'tool-1',
  toolName: 'bash',
  kind: 'interrupted',
  reason: 'aborted',
  startedAt: 1_000,
  timestamp: 1_050,
  ...overrides,
});

describe('tool-stream', () => {
  it('reduces stdout/stderr deltas into a bounded preview window', () => {
    const reducer = createToolStreamingPreviewReducer({
      maxPreviewBytes: 8,
    });

    reducer.consume(createProgressEvent({ message: 'Running command' }));
    reducer.consume(createStdoutEvent({ chunk: '12345' }));
    const preview = reducer.consume(createStdoutEvent({ chunk: '67890' }));

    expect(isToolStreamingPreviewOutput(preview)).toBe(true);
    expect(preview).toMatchObject({
      kind: 'streaming_preview',
      presentation: 'shell',
      status: 'running',
      stdoutPreview: '34567890',
      stderrPreview: '',
      truncated: true,
    });
  });

  it('emits status previews before any shell output arrives', () => {
    const reducer = createToolStreamingPreviewReducer();

    const preview = reducer.consume(createProgressEvent({ message: 'Starting bash' }));

    expect(preview).toMatchObject({
      kind: 'streaming_preview',
      presentation: 'status',
      status: 'running',
      summary: 'Starting bash',
      elapsedMs: 50,
    });
  });

  it('marks interrupted preview as terminal without waiting for final tool_output', () => {
    const reducer = createToolStreamingPreviewReducer();

    reducer.consume(createStdoutEvent({ chunk: 'step 1\n' }));
    const interrupted = reducer.consume(
      createInterruptedEvent({ reason: 'aborted', timestamp: 1_250 })
    );

    expect(interrupted).toMatchObject({
      kind: 'streaming_preview',
      presentation: 'shell',
      status: 'interrupted',
      stdoutPreview: 'step 1\n',
      truncated: false,
      elapsedMs: 250,
    });
  });

  it('handles surrogate-pair output without throwing during preview truncation', () => {
    const reducer = createToolStreamingPreviewReducer({
      maxPreviewBytes: 7,
    });

    const preview = reducer.consume(createStdoutEvent({ chunk: 'a😀bcd' }));

    expect(preview).toMatchObject({
      kind: 'streaming_preview',
      presentation: 'shell',
      status: 'running',
      stdoutPreview: '😀bcd',
      truncated: true,
    });
  });
});
