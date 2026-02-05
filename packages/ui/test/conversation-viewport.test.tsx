import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useLayoutEffect } from 'react';

import { ConversationViewport } from '../src/ai/conversation-viewport';
import { useConversationViewportStore } from '../src/ai/conversation-viewport/context';

const resizeCallbacks: Array<() => void> = [];

class ResizeObserverMock {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    resizeCallbacks.push(() => this.callback([], this as unknown as ResizeObserver));
  }

  observe() {
    this.callback([], this as unknown as ResizeObserver);
  }

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

const triggerResizeObservers = () => {
  resizeCallbacks.forEach((callback) => callback());
};

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

let originalRaf: typeof globalThis.requestAnimationFrame | undefined;
let rafSpy: ReturnType<typeof vi.spyOn> | null = null;

describe('ConversationViewport', () => {
  beforeEach(() => {
    resizeCallbacks.length = 0;
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

  it('updates isAtBottom when user scrolls up', async () => {
    let storeRef: ReturnType<typeof useConversationViewportStore> | null = null;

    render(
      <ConversationViewport data-testid="viewport">
        <StoreSpy onStore={(store) => (storeRef = store)} />
        <div>content</div>
      </ConversationViewport>
    );

    await waitFor(() => {
      expect(storeRef).not.toBeNull();
    });

    const viewport = screen.getByTestId('viewport') as HTMLDivElement;
    let scrollTop = 0;
    Object.defineProperty(viewport, 'scrollTop', {
      get: () => scrollTop,
      set: (value) => {
        scrollTop = value;
      },
      configurable: true,
    });
    Object.defineProperty(viewport, 'scrollHeight', {
      value: 500,
      configurable: true,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      value: 100,
      configurable: true,
    });

    scrollTop = 400;
    viewport.dispatchEvent(new Event('scroll'));
    expect(storeRef?.getState().isAtBottom).toBe(true);

    scrollTop = 300;
    viewport.dispatchEvent(new Event('scroll'));
    expect(storeRef?.getState().isAtBottom).toBe(false);
  });

  it('scrolls to bottom when scrollToBottom is triggered', async () => {
    let storeRef: ReturnType<typeof useConversationViewportStore> | null = null;

    render(
      <ConversationViewport data-testid="viewport">
        <StoreSpy onStore={(store) => (storeRef = store)} />
        <div>content</div>
      </ConversationViewport>
    );

    await waitFor(() => {
      expect(storeRef).not.toBeNull();
    });

    const viewport = screen.getByTestId('viewport') as HTMLDivElement;
    let scrollTop = 0;
    Object.defineProperty(viewport, 'scrollTop', {
      get: () => scrollTop,
      set: (value) => {
        scrollTop = value;
      },
      configurable: true,
    });
    Object.defineProperty(viewport, 'scrollHeight', {
      value: 900,
      configurable: true,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      value: 300,
      configurable: true,
    });
    const scrollToSpy = vi.fn(({ top }: { top: number }) => {
      scrollTop = top;
    });
    Object.defineProperty(viewport, 'scrollTo', {
      value: scrollToSpy,
      configurable: true,
    });

    storeRef?.getState().scrollToBottom();
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 900, behavior: 'auto' });
  });

  it('registers viewport height for slack calculations', async () => {
    let storeRef: ReturnType<typeof useConversationViewportStore> | null = null;

    render(
      <ConversationViewport data-testid="viewport">
        <StoreSpy onStore={(store) => (storeRef = store)} />
        <div>content</div>
      </ConversationViewport>
    );

    await waitFor(() => {
      expect(storeRef).not.toBeNull();
    });

    const viewport = screen.getByTestId('viewport') as HTMLDivElement;
    Object.defineProperty(viewport, 'clientHeight', {
      value: 240,
      configurable: true,
    });

    triggerResizeObservers();

    expect(storeRef?.getState().height.viewport).toBe(240);
  });
});
