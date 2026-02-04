import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { render, waitFor } from '@testing-library/react';
import { useLayoutEffect } from 'react';

import { ConversationViewport } from '../src/ai/conversation-viewport';
import { useConversationViewportStore } from '../src/ai/conversation-viewport/context';
import type { ConversationViewportAutoScrollEvent } from '../src/ai/conversation-viewport/store';
import { ConversationMessageProvider } from '../src/ai/message/context';
import { getMessageViewportFlags } from '../src/ai/message/root';
import { MessageRoot } from '../src/ai/message/root';

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
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

  useLayoutEffect(() => {
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

describe('MessageRoot', () => {
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

  it('registers user message height when last message is user', async () => {
    const messages: UIMessage[] = [
      {
        id: 'user-1',
        role: 'user',
        parts: [{ type: 'text', text: 'hi' }],
      },
    ];
    const flags = getMessageViewportFlags({
      hasViewport: true,
      turnAnchor: 'top',
      messageRole: 'user',
      messages,
      index: 0,
    });

    expect(flags.shouldRegisterUser).toBe(true);
  });

  it('registers previous user message height when last message is assistant', async () => {
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
    const flags = getMessageViewportFlags({
      hasViewport: true,
      turnAnchor: 'top',
      messageRole: 'user',
      messages,
      index: 0,
    });

    expect(flags.shouldRegisterUser).toBe(true);
  });

  it('emits runStart after assistant message renders while running', async () => {
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
    const autoScrollSpy = vi.fn();

    render(
      <ConversationViewport>
        <StoreSeed viewport={400} inset={80} userMessage={120} />
        <AutoScrollSpy onCall={autoScrollSpy} />
        <ConversationMessageProvider
          message={messages[1]!}
          messages={messages}
          index={1}
          status="streaming"
        >
          <MessageRoot />
        </ConversationMessageProvider>
      </ConversationViewport>
    );

    await waitFor(() => {
      expect(autoScrollSpy).toHaveBeenCalledWith('runStart');
    });
  });
});
