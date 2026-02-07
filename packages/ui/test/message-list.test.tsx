import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { UIMessage } from 'ai';

import { MessageList } from '../src/ai/message-list';
import * as conversationViewport from '../src/ai/conversation-viewport';

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

  it('adds enter animation for runStart (new user + loading)', () => {
    const renderMessage = createRenderMessage();

    const baseMessages: UIMessage[] = [
      { id: 'assistant-0', role: 'assistant', parts: [{ type: 'text', text: 'hi' }] },
    ];

    const { rerender } = render(
      <MessageList
        messages={baseMessages}
        status="ready"
        renderMessage={renderMessage}
        showScrollButton={false}
      />
    );

    const runStartMessages: UIMessage[] = [
      ...baseMessages,
      { id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'yo' }] },
      { id: 'assistant-1', role: 'assistant', parts: [] },
    ];

    rerender(
      <MessageList
        messages={runStartMessages}
        status="submitted"
        renderMessage={renderMessage}
        showScrollButton={false}
      />
    );

    const user = screen.getByTestId('message-user-1');
    expect(user.parentElement?.getAttribute('data-slot')).toBe('message-enter');
    expect(user.parentElement?.className).toContain('motion-safe:animate-in');

    const loading = screen.getByTestId('message-assistant-1');
    expect(loading.parentElement?.getAttribute('data-slot')).toBe('message-enter');
    expect(loading.parentElement?.className).toContain('motion-safe:animate-in');

    const prev = screen.getByTestId('message-assistant-0');
    expect(prev.parentElement?.getAttribute('data-slot')).toBeNull();
  });

  it('scrolls to bottom on runStart (status enters running)', () => {
    const scrollToBottomSpy = vi.fn();
    const storeSpy = vi
      .spyOn(conversationViewport, 'useConversationViewportStore')
      .mockReturnValue({
        getState: () => ({ scrollToBottom: scrollToBottomSpy }),
      } as unknown as ReturnType<typeof conversationViewport.useConversationViewportStore>);

    const messages: UIMessage[] = [
      { id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
    ];

    const { rerender } = render(
      <MessageList
        messages={messages}
        status="ready"
        renderMessage={createRenderMessage()}
        showScrollButton={false}
      />
    );

    expect(scrollToBottomSpy).toHaveBeenCalledTimes(0);

    rerender(
      <MessageList
        messages={messages}
        status="submitted"
        renderMessage={createRenderMessage()}
        showScrollButton={false}
      />
    );
    expect(scrollToBottomSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
    expect(scrollToBottomSpy).toHaveBeenCalledTimes(1);

    rerender(
      <MessageList
        messages={messages}
        status="streaming"
        renderMessage={createRenderMessage()}
        showScrollButton={false}
      />
    );
    expect(scrollToBottomSpy).toHaveBeenCalledTimes(1);

    rerender(
      <MessageList
        messages={messages}
        status="ready"
        renderMessage={createRenderMessage()}
        showScrollButton={false}
      />
    );
    expect(scrollToBottomSpy).toHaveBeenCalledTimes(1);

    rerender(
      <MessageList
        messages={messages}
        status="submitted"
        renderMessage={createRenderMessage()}
        showScrollButton={false}
      />
    );
    expect(scrollToBottomSpy).toHaveBeenCalledTimes(2);

    storeSpy.mockRestore();
  });
});
