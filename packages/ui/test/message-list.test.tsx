import { useLayoutEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { UIMessage } from 'ai';

import { useConversationViewportStore } from '../src/ai/conversation-viewport/context';
import type { ConversationViewportAutoScrollEvent } from '../src/ai/conversation-viewport/store';
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

const AutoScrollSpy = ({
  onCall,
}: {
  onCall: (event: ConversationViewportAutoScrollEvent) => void;
}) => {
  const store = useConversationViewportStore();

  useLayoutEffect(() => {
    return store.getState().onAutoScrollEvent((event) => onCall(event));
  }, [onCall, store]);

  return null;
};

const createRenderMessage =
  () =>
  ({ message }: { message: UIMessage }) => <div data-testid={`message-${message.id}`} />;

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

  it('does not inject placeholder messages while streaming', () => {
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
    expect(screen.queryByTestId('message-user-1-thinking')).toBeNull();
  });

  it('emits initialize event on first render with messages', async () => {
    const messages: UIMessage[] = [
      {
        id: 'user-1',
        role: 'user',
        parts: [{ type: 'text', text: 'hi' }],
      },
    ];
    const autoScrollSpy = vi.fn();

    render(
      <MessageList
        messages={messages}
        status="ready"
        renderMessage={createRenderMessage()}
        footer={<AutoScrollSpy onCall={autoScrollSpy} />}
      />
    );

    await waitFor(() => {
      expect(autoScrollSpy).toHaveBeenCalledWith('initialize');
    });
  });
});
