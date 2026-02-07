import { describe, expect, it } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { useLayoutEffect } from 'react';

import {
  ConversationViewport,
  ConversationViewportTurnTail,
} from '../src/ai/conversation-viewport';
import { useConversationViewportStore } from '../src/ai/conversation-viewport/context';

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

const StoreSpy = ({
  onStore,
}: {
  onStore: (store: ReturnType<typeof useConversationViewportStore>) => void;
}) => {
  const store = useConversationViewportStore();

  useLayoutEffect(() => {
    onStore(store);
  }, [onStore, store]);

  return null;
};

describe('ConversationViewportTurnTail', () => {
  it('subtracts ConversationContent gap/padding-bottom from slack minHeight', async () => {
    let storeRef: ReturnType<typeof useConversationViewportStore> | null = null;

    const { container } = render(
      <ConversationViewport scrollToBottomOnRunStart={false}>
        <StoreSpy onStore={(store) => (storeRef = store)} />

        <div
          data-slot="conversation-content"
          style={{
            display: 'flex',
            flexDirection: 'column',
            '--ai-conversation-content-gap': '4px',
            '--ai-conversation-content-padding-bottom': '16px',
          }}
        >
          <div>content</div>
          <ConversationViewportTurnTail enabled>
            <div>tail</div>
          </ConversationViewportTurnTail>
        </div>
      </ConversationViewport>
    );

    await waitFor(() => {
      expect(storeRef).not.toBeNull();
    });

    act(() => {
      storeRef?.getState().registerViewport().setHeight(712);
      storeRef?.getState().registerContentInset().setHeight(140);
      storeRef?.getState().registerUserMessageHeight().setHeight(56);
    });

    const turnTail = container.querySelector('[data-slot="conversation-turn-tail"]') as HTMLElement;
    expect(turnTail).not.toBeNull();

    await waitFor(() => {
      // 712 - 140 - 56 - (pb-4 16px) - (gap-1 4px) = 496
      expect(turnTail.style.minHeight).toBe('496px');
    });
  });
});
