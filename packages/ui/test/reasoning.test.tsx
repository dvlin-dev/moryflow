import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// STREAMDOWN_ANIM: 该测试只验证 ReasoningContent 是否在 streaming 时把 animated/isAnimating 透传给 Streamdown。
vi.mock('streamdown', () => ({
  Streamdown: ({
    children,
    animated,
    isAnimating,
  }: {
    children?: ReactNode;
    animated?: boolean;
    isAnimating?: boolean;
  }) => (
    <div
      data-testid="streamdown"
      data-animated={String(Boolean(animated))}
      data-is-animating={String(Boolean(isAnimating))}
    >
      {children}
    </div>
  ),
}));

import { Reasoning, ReasoningContent, ReasoningTrigger } from '../src/ai/reasoning';

describe('Reasoning', () => {
  it('renders trigger text without leading thinking icon', () => {
    render(
      <Reasoning isStreaming={false} defaultOpen={false}>
        <ReasoningTrigger />
        <ReasoningContent>hello</ReasoningContent>
      </Reasoning>
    );

    const trigger = screen.getByRole('button');
    expect(trigger.textContent).toContain('Thinking');
    expect(trigger.firstElementChild?.tagName.toLowerCase()).not.toBe('svg');
  });

  it('uses right-pointing chevron when collapsed (same direction as tool summary)', () => {
    render(
      <Reasoning isStreaming={false} defaultOpen={false}>
        <ReasoningTrigger />
        <ReasoningContent>hello</ReasoningContent>
      </Reasoning>
    );

    const trigger = screen.getByRole('button');
    const chevron = trigger.querySelector('svg');
    expect(chevron).not.toBeNull();
    expect(chevron?.className.baseVal || chevron?.getAttribute('class')).toContain('-rotate-90');
  });

  it('enables Streamdown animation while streaming', () => {
    render(
      <Reasoning isStreaming defaultOpen>
        <ReasoningTrigger />
        <ReasoningContent>hello</ReasoningContent>
      </Reasoning>
    );

    const streamdown = screen.getByTestId('streamdown');
    expect(streamdown.dataset.animated).toBe('true');
    expect(streamdown.dataset.isAnimating).toBe('true');
  });

  it('disables Streamdown animation when not streaming', () => {
    render(
      <Reasoning isStreaming={false} defaultOpen>
        <ReasoningTrigger />
        <ReasoningContent>hello</ReasoningContent>
      </Reasoning>
    );

    const streamdown = screen.getByTestId('streamdown');
    expect(streamdown.dataset.animated).toBe('true');
    expect(streamdown.dataset.isAnimating).toBe('false');
  });

  it('auto-collapses after streaming ends', () => {
    const { rerender } = render(
      <Reasoning isStreaming defaultOpen>
        <ReasoningTrigger />
        <ReasoningContent>hello</ReasoningContent>
      </Reasoning>
    );

    rerender(
      <Reasoning isStreaming={false} defaultOpen>
        <ReasoningTrigger />
        <ReasoningContent>hello</ReasoningContent>
      </Reasoning>
    );

    return waitFor(() => {
      expect(screen.queryByTestId('streamdown')).toBeNull();
    });
  });

  it('keeps expanded when user manually re-opens before streaming ends', () => {
    const { rerender } = render(
      <Reasoning isStreaming defaultOpen>
        <ReasoningTrigger />
        <ReasoningContent>hello</ReasoningContent>
      </Reasoning>
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger); // close
    fireEvent.click(trigger); // manual reopen

    rerender(
      <Reasoning isStreaming={false} defaultOpen>
        <ReasoningTrigger />
        <ReasoningContent>hello</ReasoningContent>
      </Reasoning>
    );

    expect(screen.getByTestId('streamdown')).not.toBeNull();
  });
});
