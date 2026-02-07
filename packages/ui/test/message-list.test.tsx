import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { UIMessage } from 'ai';

import { MessageList } from '../src/ai/message-list';
import * as auiEvent from '../src/ai/assistant-ui/utils/hooks/useAuiEvent';

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

  it('renders messages with renderMessage and always includes tail sentinel', () => {
    const messages: UIMessage[] = [
      { id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
      { id: 'assistant-1', role: 'assistant', parts: [{ type: 'text', text: 'hello' }] },
    ];

    const { container } = render(
      <MessageList messages={messages} status="ready" renderMessage={createRenderMessage()} />
    );

    expect(screen.getByTestId('message-user-1')).not.toBeNull();
    expect(screen.getByTestId('message-assistant-1')).not.toBeNull();
    expect(container.querySelector('[data-slot="conversation-turn-tail"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="conversation-tail"]')).not.toBeNull();
  });

  it('keeps turn tail container when last message is user', () => {
    const messages: UIMessage[] = [
      { id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
    ];

    const { container } = render(
      <MessageList messages={messages} status="ready" renderMessage={createRenderMessage()} />
    );

    expect(screen.getByTestId('message-user-1')).not.toBeNull();
    expect(container.querySelector('[data-slot="conversation-turn-tail"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="conversation-tail"]')).not.toBeNull();
  });

  it('emits thread.runStart when status enters running state', () => {
    const spy = vi.spyOn(auiEvent, 'emitAuiEvent');

    const messages: UIMessage[] = [
      { id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
    ];

    const { rerender } = render(
      <MessageList messages={messages} status="ready" renderMessage={createRenderMessage()} />
    );

    expect(spy.mock.calls.filter(([name]) => name === 'thread.runStart')).toHaveLength(0);

    rerender(
      <MessageList messages={messages} status="submitted" renderMessage={createRenderMessage()} />
    );
    expect(spy.mock.calls.filter(([name]) => name === 'thread.runStart')).toHaveLength(1);

    rerender(
      <MessageList messages={messages} status="streaming" renderMessage={createRenderMessage()} />
    );
    expect(spy.mock.calls.filter(([name]) => name === 'thread.runStart')).toHaveLength(1);

    rerender(
      <MessageList messages={messages} status="ready" renderMessage={createRenderMessage()} />
    );
    expect(spy.mock.calls.filter(([name]) => name === 'thread.runStart')).toHaveLength(1);

    rerender(
      <MessageList messages={messages} status="submitted" renderMessage={createRenderMessage()} />
    );
    expect(spy.mock.calls.filter(([name]) => name === 'thread.runStart')).toHaveLength(2);
  });
});
