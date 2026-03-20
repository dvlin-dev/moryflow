import { describe, expect, it } from 'vitest';
import {
  TOOL_FINISHED_STATES,
  TOOL_IN_PROGRESS_STATES,
  isToolFinishedState,
  isToolInProgressState,
  isToolPartStreaming,
  resolveReasoningOpenState,
  resolveToolPartState,
  resolveToolOpenState,
  shouldAutoCollapse,
} from '../ui-message/visibility-policy';

describe('ui-message visibility-policy', () => {
  it('exposes in-progress and finished tool state groups', () => {
    expect(TOOL_IN_PROGRESS_STATES).toEqual([
      'input-streaming',
      'input-available',
      'approval-requested',
      'approval-responded',
    ]);
    expect(TOOL_FINISHED_STATES).toEqual([
      'output-available',
      'output-error',
      'output-denied',
      'output-interrupted',
    ]);
  });

  it('recognizes in-progress states', () => {
    expect(isToolInProgressState('input-streaming')).toBe(true);
    expect(isToolInProgressState('approval-responded')).toBe(true);
    expect(isToolInProgressState('output-available')).toBe(false);
    expect(isToolInProgressState(undefined)).toBe(false);
  });

  it('recognizes finished states', () => {
    expect(isToolFinishedState('output-available')).toBe(true);
    expect(isToolFinishedState('output-error')).toBe(true);
    expect(isToolFinishedState('input-available')).toBe(false);
    expect(isToolFinishedState(null)).toBe(false);
  });

  it('triggers auto-collapse only for InProgress -> Finished transition', () => {
    expect(shouldAutoCollapse('input-streaming', 'output-available')).toBe(true);
    expect(shouldAutoCollapse('approval-responded', 'output-error')).toBe(true);

    expect(shouldAutoCollapse('input-streaming', 'input-available')).toBe(false);
    expect(shouldAutoCollapse('output-available', 'output-error')).toBe(false);
    expect(shouldAutoCollapse(undefined, 'output-available')).toBe(false);
  });

  it('resolves tool open state with in-progress default and manual-expand priority', () => {
    expect(resolveToolOpenState({ state: 'input-available', hasManualExpanded: false })).toBe(true);
    expect(resolveToolOpenState({ state: 'output-available', hasManualExpanded: false })).toBe(
      false
    );
    expect(resolveToolOpenState({ state: 'output-available', hasManualExpanded: true })).toBe(true);
  });

  it('resolves reasoning open state with streaming default and manual-expand priority', () => {
    expect(resolveReasoningOpenState({ isStreaming: true, hasManualExpanded: false })).toBe(true);
    expect(resolveReasoningOpenState({ isStreaming: false, hasManualExpanded: false })).toBe(false);
    expect(resolveReasoningOpenState({ isStreaming: false, hasManualExpanded: true })).toBe(true);
  });

  it('maps preliminary output-available back to an in-progress tool state', () => {
    expect(
      resolveToolPartState({
        state: 'output-available',
        preliminary: true,
        output: {
          kind: 'streaming_preview',
          presentation: 'shell',
          status: 'running',
          elapsedMs: 10,
          bytes: { stdout: 1, stderr: 0 },
          truncated: false,
        },
      })
    ).toBe('input-available');
    expect(
      isToolPartStreaming({
        state: 'output-available',
        preliminary: true,
        output: {
          kind: 'streaming_preview',
          presentation: 'status',
          status: 'running',
          elapsedMs: 5,
          bytes: { stdout: 0, stderr: 0 },
          truncated: false,
        },
      })
    ).toBe(true);
  });

  it('maps interrupted preview output to explicit interrupted terminal state', () => {
    expect(
      resolveToolPartState({
        state: 'output-available',
        output: {
          kind: 'streaming_preview',
          presentation: 'status',
          status: 'interrupted',
          elapsedMs: 5,
          bytes: { stdout: 0, stderr: 0 },
          truncated: false,
        },
      })
    ).toBe('output-interrupted');
    expect(
      isToolPartStreaming({
        state: 'output-available',
        output: {
          kind: 'streaming_preview',
          presentation: 'status',
          status: 'interrupted',
          elapsedMs: 5,
          bytes: { stdout: 0, stderr: 0 },
          truncated: false,
        },
      })
    ).toBe(false);
  });
});
