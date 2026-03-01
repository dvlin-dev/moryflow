import { describe, expect, it } from 'vitest';
import {
  resolveInitialReasoningOpen,
  resolveInitialToolOpen,
  resolveReasoningVisibilityAction,
  resolveToolVisibilityAction,
} from '../visibility-transitions';

describe('visibility-transitions', () => {
  it('resolves initial tool open state from defaultOpen and tool state', () => {
    expect(resolveInitialToolOpen({ defaultOpen: true, state: 'output-available' })).toBe(true);
    expect(resolveInitialToolOpen({ defaultOpen: false, state: 'input-streaming' })).toBe(true);
    expect(resolveInitialToolOpen({ defaultOpen: false, state: 'output-available' })).toBe(false);
  });

  it('resolves tool visibility action for in-progress and finished transitions', () => {
    expect(
      resolveToolVisibilityAction({
        previousState: 'output-available',
        nextState: 'input-available',
        hasManualExpanded: false,
      })
    ).toBe('expand');

    expect(
      resolveToolVisibilityAction({
        previousState: 'input-available',
        nextState: 'output-available',
        hasManualExpanded: false,
      })
    ).toBe('collapse');

    expect(
      resolveToolVisibilityAction({
        previousState: 'input-available',
        nextState: 'output-available',
        hasManualExpanded: true,
      })
    ).toBe('none');
  });

  it('resolves initial reasoning open state', () => {
    expect(resolveInitialReasoningOpen({ defaultOpen: true, isStreaming: false })).toBe(true);
    expect(resolveInitialReasoningOpen({ defaultOpen: false, isStreaming: true })).toBe(false);
    expect(resolveInitialReasoningOpen({ isStreaming: true })).toBe(true);
    expect(resolveInitialReasoningOpen({ isStreaming: false })).toBe(false);
  });

  it('resolves reasoning visibility action for streaming transitions', () => {
    expect(
      resolveReasoningVisibilityAction({
        wasStreaming: false,
        isStreaming: true,
        isOpen: false,
        hasManualExpanded: false,
      })
    ).toBe('expand');

    expect(
      resolveReasoningVisibilityAction({
        wasStreaming: true,
        isStreaming: false,
        isOpen: true,
        hasManualExpanded: false,
      })
    ).toBe('collapse-delayed');

    expect(
      resolveReasoningVisibilityAction({
        wasStreaming: true,
        isStreaming: false,
        isOpen: true,
        hasManualExpanded: true,
      })
    ).toBe('none');
  });
});
