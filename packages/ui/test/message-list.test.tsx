import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { UIMessage } from 'ai';

import { MessageList } from '../src/ai/message-list';

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
}

class MutationObserverMock {
  observe() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

if (!globalThis.MutationObserver) {
  globalThis.MutationObserver = MutationObserverMock as typeof MutationObserver;
}

const createRenderMessage =
  () =>
  ({ message }: { message: UIMessage }) => <div data-testid={`message-${message.id}`} />;

describe('MessageList', () => {
  it('renders empty state when no messages', () => {
    render(
      <MessageList
        messages={[]}
        status="ready"
        renderMessage={createRenderMessage()}
        emptyState={{ title: 'Empty', description: 'No messages' }}
      />
    );

    expect(screen.getByText('Empty')).not.toBeNull();
    expect(screen.getByText('No messages')).not.toBeNull();
  });

  it('renders messages with renderMessage', () => {
    const messages: UIMessage[] = [
      { id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
      { id: 'assistant-1', role: 'assistant', parts: [{ type: 'text', text: 'hello' }] },
    ];

    render(
      <MessageList messages={messages} status="ready" renderMessage={createRenderMessage()} />
    );

    expect(screen.getByTestId('message-user-1')).not.toBeNull();
    expect(screen.getByTestId('message-assistant-1')).not.toBeNull();
  });
});
