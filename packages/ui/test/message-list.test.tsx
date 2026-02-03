import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import type { ChatStatus, UIMessage } from 'ai';

import { MessageList } from '../src/ai/message-list';

const originalScrollTo = HTMLElement.prototype.scrollTo;

afterEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    value: originalScrollTo,
    configurable: true,
    writable: true,
  });
  vi.useRealTimers();
});

describe('MessageList', () => {
  it('keeps the footer outside the scroll viewport', () => {
    const messages: UIMessage[] = [
      {
        id: 'm1',
        role: 'user',
        parts: [{ type: 'text', text: 'Hello' }],
      },
    ];

    render(
      <MessageList
        messages={messages}
        status={'ready' as ChatStatus}
        footer={<div data-testid="footer">footer</div>}
        renderMessage={({ message }) => (
          <div data-testid={`message-${message.id}`}>{message.id}</div>
        )}
      />
    );

    const viewport = screen.getByRole('log');
    expect(within(viewport).queryByTestId('footer')).toBeNull();
    expect(screen.queryByTestId('footer')).not.toBeNull();
    expect(viewport.className).toContain('min-h-0');
  });

  it('renders loading placeholder when waiting for assistant', () => {
    const messages: UIMessage[] = [
      {
        id: 'm1',
        role: 'user',
        parts: [{ type: 'text', text: 'Hello' }],
      },
    ];

    render(
      <MessageList
        messages={messages}
        status={'submitted' as ChatStatus}
        loading={<div data-testid="loading">loading</div>}
        renderMessage={({ message }) => (
          <div data-testid={`message-${message.id}`}>{message.id}</div>
        )}
      />
    );

    expect(screen.queryByTestId('loading')).not.toBeNull();
  });

  it('falls back to auto scroll when user message height is not measured', async () => {
    vi.useFakeTimers();

    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      value: scrollTo,
      configurable: true,
      writable: true,
    });

    const messages: UIMessage[] = [
      {
        id: 'm1',
        role: 'user',
        parts: [{ type: 'text', text: 'Hello' }],
      },
    ];

    const { rerender } = render(
      <MessageList
        messages={messages}
        status={'ready' as ChatStatus}
        renderMessage={({ message }) => (
          <div data-testid={`message-${message.id}`}>{message.id}</div>
        )}
      />
    );

    const initialCalls = scrollTo.mock.calls.length;

    const nextMessages: UIMessage[] = [
      ...messages,
      {
        id: 'm2',
        role: 'user',
        parts: [{ type: 'text', text: 'Second' }],
      },
    ];

    rerender(
      <MessageList
        messages={nextMessages}
        status={'submitted' as ChatStatus}
        renderMessage={({ message }) => (
          <div data-testid={`message-${message.id}`}>{message.id}</div>
        )}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(scrollTo.mock.calls.length).toBeGreaterThan(initialCalls);
  });
});
