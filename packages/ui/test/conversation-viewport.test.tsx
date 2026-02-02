import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ConversationViewport } from '../src/ai/conversation-viewport';
import { ConversationViewportSlack } from '../src/ai/conversation-viewport/slack';
import { useConversationViewportStore } from '../src/ai/conversation-viewport/context';

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

describe('ConversationViewportSlack', () => {
  it('applies minHeight by default', () => {
    render(
      <ConversationViewport>
        <StoreSeed viewport={400} inset={80} userMessage={120} />
        <ConversationViewportSlack data-testid="slack">
          <div>content</div>
        </ConversationViewportSlack>
      </ConversationViewport>
    );

    const slack = screen.getByTestId('slack');
    expect(slack.style.minHeight).toBe('200px');
  });

  it('does not apply minHeight when disabled', () => {
    render(
      <ConversationViewport>
        <StoreSeed viewport={400} inset={80} userMessage={120} />
        <ConversationViewportSlack enabled={false} data-testid="slack">
          <div>content</div>
        </ConversationViewportSlack>
      </ConversationViewport>
    );

    const slack = screen.getByTestId('slack');
    expect(slack.style.minHeight).toBe('');
  });
});
