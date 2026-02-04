import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { ConversationViewport } from '../src/ai/conversation-viewport';
import { ConversationViewportSlack } from '../src/ai/conversation-viewport/slack';
import { useConversationViewportStore } from '../src/ai/conversation-viewport/context';
import { ConversationMessageProvider } from '../src/ai/message/context';
import type { UIMessage } from 'ai';

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
}: {
  viewport: number;
  inset: number;
  userMessage: number;
}) => {
  const store = useConversationViewportStore();

  useEffect(() => {
    store.setState({
      height: {
        viewport,
        inset,
        userMessage,
      },
    });
  }, [inset, store, userMessage, viewport]);

  return null;
};

const makeMessage = (id: string, role: UIMessage['role']): UIMessage => ({
  id,
  role,
  parts: [{ type: 'text', text: 'hi' }],
});

describe('ConversationViewportSlack', () => {
  it('applies minHeight by default', async () => {
    const messages = [makeMessage('user-1', 'user'), makeMessage('assistant-1', 'assistant')];
    render(
      <ConversationViewport>
        <StoreSeed viewport={400} inset={80} userMessage={120} />
        <ConversationMessageProvider message={messages[1]!} messages={messages} index={1}>
          <ConversationViewportSlack>
            <div data-testid="slack">content</div>
          </ConversationViewportSlack>
        </ConversationMessageProvider>
      </ConversationViewport>
    );

    const slack = screen.getByTestId('slack');
    await waitFor(() => {
      expect(slack.style.minHeight).toBe('200px');
    });
  });

  it('does not apply minHeight when message is not last assistant', async () => {
    const messages = [makeMessage('user-1', 'user')];
    render(
      <ConversationViewport>
        <StoreSeed viewport={400} inset={80} userMessage={120} />
        <ConversationMessageProvider message={messages[0]!} messages={messages} index={0}>
          <ConversationViewportSlack>
            <div data-testid="slack">content</div>
          </ConversationViewportSlack>
        </ConversationMessageProvider>
      </ConversationViewport>
    );

    const slack = screen.getByTestId('slack');
    await waitFor(() => {
      expect(slack.style.minHeight).toBe('');
    });
  });
});
