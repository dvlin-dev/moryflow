import { useLayoutEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ChatStatus, UIMessage } from 'ai';

import { useConversationViewportStore } from '../src/ai/conversation-viewport/context';
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

let originalRaf: typeof globalThis.requestAnimationFrame | undefined;
let rafSpy: ReturnType<typeof vi.spyOn> | null = null;

const ScrollSpyMessage = ({
  messageId,
  onCall,
}: {
  messageId: string;
  onCall?: ReturnType<typeof vi.fn>;
}) => {
  const store = useConversationViewportStore();

  useLayoutEffect(() => {
    if (!onCall) return;
    return store.getState().onScrollToBottom(({ behavior }) => onCall({ behavior }));
  }, [onCall, store]);

  return <div data-testid={`message-${messageId}`} />;
};

const ViewportStateInitializer = ({
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

  useLayoutEffect(() => {
    store.setState((state) => ({
      ...state,
      height: {
        ...state.height,
        viewport,
        inset,
        userMessage,
        topInset,
      },
      turnAnchor: 'top',
    }));
  }, [inset, store, topInset, userMessage, viewport]);

  return null;
};

const createRenderMessage =
  (onCall?: ReturnType<typeof vi.fn>) =>
  ({ message }: { message: UIMessage }) => (
    <ScrollSpyMessage messageId={message.id} onCall={onCall} />
  );

describe('MessageList', () => {
  beforeEach(() => {
    originalRaf = globalThis.requestAnimationFrame;
    if (!originalRaf) {
      globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      };
    }
    rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
  });

  afterEach(() => {
    rafSpy?.mockRestore();
    rafSpy = null;
    if (!originalRaf) {
      // @ts-expect-error - 清理测试环境注入
      delete globalThis.requestAnimationFrame;
    } else {
      globalThis.requestAnimationFrame = originalRaf;
    }
  });

  it('renders thinking placeholder while streaming after user message', () => {
    const messages: UIMessage[] = [
      {
        id: 'user-1',
        role: 'user',
        parts: [{ type: 'text', text: 'hi' }],
      },
    ];

    render(
      <MessageList messages={messages} status="streaming" renderMessage={createRenderMessage()} />
    );

    expect(screen.queryByTestId('message-user-1')).not.toBeNull();
    expect(screen.queryByTestId('message-user-1-thinking')).not.toBeNull();
  });

  it('scrolls to bottom on initial render with messages', async () => {
    const messages: UIMessage[] = [
      {
        id: 'user-1',
        role: 'user',
        parts: [{ type: 'text', text: 'hi' }],
      },
    ];
    const scrollSpy = vi.fn();

    render(
      <MessageList
        messages={messages}
        status="ready"
        renderMessage={createRenderMessage(scrollSpy)}
      />
    );

    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'instant' });
    });
  });

  it('scrolls to bottom when run starts with new user message', async () => {
    const initialMessages: UIMessage[] = [];
    const nextMessages: UIMessage[] = [
      {
        id: 'user-1',
        role: 'user',
        parts: [{ type: 'text', text: 'hi' }],
      },
    ];
    const scrollSpy = vi.fn();

    const { rerender } = render(
      <MessageList
        messages={initialMessages}
        status="ready"
        renderMessage={createRenderMessage(scrollSpy)}
      />
    );

    scrollSpy.mockClear();

    rerender(
      <MessageList
        messages={nextMessages}
        status="submitted"
        renderMessage={createRenderMessage(scrollSpy)}
      />
    );

    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'auto' });
    });
  });

  it('applies slack min-height on last assistant message', async () => {
    const messages: UIMessage[] = [
      {
        id: 'user-1',
        role: 'user',
        parts: [{ type: 'text', text: 'hi' }],
      },
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'hello' }],
      },
    ];

    render(
      <MessageList
        messages={messages}
        status="ready"
        renderMessage={createRenderMessage()}
        footer={<ViewportStateInitializer viewport={400} inset={0} userMessage={100} />}
      />
    );

    const assistantNode = screen.getByTestId('message-assistant-1');

    await waitFor(() => {
      expect(assistantNode.parentElement?.style.minHeight).toBe('300px');
    });
  });
});
