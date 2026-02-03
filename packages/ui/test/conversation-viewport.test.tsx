import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { ConversationViewport } from '../src/ai/conversation-viewport';
import { ConversationViewportSlack } from '../src/ai/conversation-viewport/slack';
import { useConversationViewportStore } from '../src/ai/conversation-viewport/context';

const noop = () => {};

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
}

const StoreSeed = ({
  viewport,
  inset,
  userMessage,
  topInset = 0,
}: {
  viewport: number;
  inset: number;
  userMessage: number;
  topInset?: number;
}) => {
  const store = useConversationViewportStore();

  useEffect(() => {
    store.setState({
      height: {
        viewport,
        inset,
        userMessage,
        topInset,
      },
    });
  }, [inset, store, topInset, userMessage, viewport]);

  return null;
};

describe('ConversationViewportSlack', () => {
  it('applies minHeight by default', async () => {
    render(
      <ConversationViewport>
        <StoreSeed viewport={400} inset={80} userMessage={120} />
        <ConversationViewportSlack>
          <div data-testid="slack">content</div>
        </ConversationViewportSlack>
      </ConversationViewport>
    );

    const slack = screen.getByTestId('slack');
    await waitFor(() => {
      expect(slack.style.minHeight).toBe('200px');
    });
  });

  it('does not apply minHeight when disabled', async () => {
    render(
      <ConversationViewport>
        <StoreSeed viewport={400} inset={80} userMessage={120} />
        <ConversationViewportSlack enabled={false}>
          <div data-testid="slack">content</div>
        </ConversationViewportSlack>
      </ConversationViewport>
    );

    const slack = screen.getByTestId('slack');
    await waitFor(() => {
      expect(slack.style.minHeight).toBe('');
    });
  });

  it('subtracts topInset from minHeight', async () => {
    render(
      <ConversationViewport>
        <StoreSeed viewport={400} inset={80} userMessage={120} topInset={40} />
        <ConversationViewportSlack>
          <div data-testid="slack">content</div>
        </ConversationViewportSlack>
      </ConversationViewport>
    );

    const slack = screen.getByTestId('slack');
    await waitFor(() => {
      expect(slack.style.minHeight).toBe('160px');
    });
  });
});
