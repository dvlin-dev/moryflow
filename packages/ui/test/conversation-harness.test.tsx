import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { preserveAnchor } = vi.hoisted(() => ({
  preserveAnchor: vi.fn(),
}));

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

vi.mock('../src/ai/conversation-viewport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/ai/conversation-viewport/index')>();
  return {
    ...actual,
    useConversationViewportController: () => ({
      preserveAnchor,
      navigateToLatest: vi.fn(),
    }),
  };
});

import { Reasoning, ReasoningContent, ReasoningTrigger } from '../src/ai/reasoning';
import { Tool, ToolSummary } from '../src/ai/tool';

describe('conversation harness', () => {
  it('reasoning finishes streaming后自动折叠，并保留统一 disclosure 语义', async () => {
    preserveAnchor.mockClear();
    const { rerender } = render(
      <Reasoning isStreaming defaultOpen>
        <ReasoningTrigger viewportAnchorId="reasoning:a1" />
        <ReasoningContent>thinking</ReasoningContent>
      </Reasoning>
    );

    expect(screen.getByTestId('streamdown')).not.toBeNull();
    fireEvent.click(screen.getByRole('button'));
    expect(preserveAnchor).toHaveBeenCalledWith('reasoning:a1');

    rerender(
      <Reasoning isStreaming={false} defaultOpen>
        <ReasoningTrigger viewportAnchorId="reasoning:a1" />
        <ReasoningContent>thinking</ReasoningContent>
      </Reasoning>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('streamdown')).toBeNull();
    });
  });

  it('tool disclosure 点击时只发出 viewport 锚点意图，不改写统一语义', () => {
    preserveAnchor.mockClear();

    render(
      <Tool defaultOpen={false}>
        <ToolSummary summary="Bash completed and executed ls -la" viewportAnchorId="tool:a1:0" />
      </Tool>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(preserveAnchor).toHaveBeenCalledWith('tool:a1:0');
  });
});
