import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

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
});
