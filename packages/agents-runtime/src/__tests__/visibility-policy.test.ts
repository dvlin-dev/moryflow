import { describe, expect, it } from 'vitest';
import {
  AUTO_COLLAPSE_DELAY_MS,
  TOOL_FINISHED_STATES,
  TOOL_IN_PROGRESS_STATES,
  isToolFinishedState,
  isToolInProgressState,
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
    expect(TOOL_FINISHED_STATES).toEqual(['output-available', 'output-error', 'output-denied']);
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

  it('uses the fixed auto-collapse delay', () => {
    expect(AUTO_COLLAPSE_DELAY_MS).toBe(1000);
  });
});
