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
    // 测试中默认关闭 debug 日志（需要时可手动打开全局开关）。
    // @ts-expect-error - test-only cleanup
    delete globalThis.__AUI_DEBUG_AUTO_SCROLL__;

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
    const clientHeight = 100;
    const scrollHeight = 500;
    let scrollTop = 0;

    Object.defineProperty(viewport, 'scrollTop', {
      get: () => scrollTop,
      set: (value) => {
        scrollTop = value;
      },
      configurable: true,
    });
    Object.defineProperty(viewport, 'scrollHeight', {
      value: scrollHeight,
      configurable: true,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      value: clientHeight,
      configurable: true,
    });

    // land at bottom
    scrollTop = scrollHeight - clientHeight;
    viewport.dispatchEvent(new Event('scroll'));
    expect(storeRef?.getState().isAtBottom).toBe(true);

    // user scrolls up
    scrollTop = scrollHeight - clientHeight - 50;
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
    const clientHeight = 300;
    const scrollHeight = 900;
    let scrollTop = 0;

    Object.defineProperty(viewport, 'scrollTop', {
      get: () => scrollTop,
      set: (value) => {
        scrollTop = value;
      },
      configurable: true,
    });
    Object.defineProperty(viewport, 'scrollHeight', {
      value: scrollHeight,
      configurable: true,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      value: clientHeight,
      configurable: true,
    });

    const scrollToSpy = vi.fn(({ top }: { top: number; behavior: ScrollBehavior }) => {
      scrollTop = Math.max(0, top - clientHeight);
    });
    Object.defineProperty(viewport, 'scrollTo', {
      value: scrollToSpy,
      configurable: true,
    });

    storeRef?.getState().scrollToBottom();
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 900, behavior: 'auto' });
  });

  it('auto-follows while at bottom and pauses on any user scroll up', async () => {
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
    const clientHeight = 240;
    let scrollHeight = 900;
    let scrollTop = 0;

    Object.defineProperty(viewport, 'scrollTop', {
      get: () => scrollTop,
      set: (value) => {
        scrollTop = value;
      },
      configurable: true,
    });
    Object.defineProperty(viewport, 'scrollHeight', {
      get: () => scrollHeight,
      configurable: true,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      value: clientHeight,
      configurable: true,
    });

    const scrollToSpy = vi.fn(({ top }: { top: number; behavior: ScrollBehavior }) => {
      scrollTop = Math.max(0, top - clientHeight);
    });
    Object.defineProperty(viewport, 'scrollTo', {
      value: scrollToSpy,
      configurable: true,
    });

    // at bottom => following
    scrollTop = scrollHeight - clientHeight;
    viewport.dispatchEvent(new Event('scroll'));
    expect(storeRef?.getState().isAtBottom).toBe(true);

    // content grows while following => should auto-scroll to keep at bottom
    scrollHeight = 950;
    triggerResizeObservers();
    expect(scrollToSpy).toHaveBeenCalled();

    scrollToSpy.mockClear();

    // any user scroll up => pause following
    scrollTop = scrollHeight - clientHeight - 2;
    viewport.dispatchEvent(new Event('scroll'));
    expect(storeRef?.getState().isAtBottom).toBe(false);

    // content grows again but following is paused => do not auto-scroll
    scrollHeight = 1000;
    triggerResizeObservers();
    expect(scrollToSpy).not.toHaveBeenCalled();

    // back to bottom => resume following
    scrollTop = scrollHeight - clientHeight;
    viewport.dispatchEvent(new Event('scroll'));
    expect(storeRef?.getState().isAtBottom).toBe(true);

    // growth while following again => auto-scroll
    scrollHeight = 1030;
    triggerResizeObservers();
    expect(scrollToSpy).toHaveBeenCalled();
  });

  it('keeps following across layout shrink rollback (scrollHeight decreases)', async () => {
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
    const clientHeight = 240;
    let scrollHeight = 900;
    let scrollTop = 0;

    Object.defineProperty(viewport, 'scrollTop', {
      get: () => scrollTop,
      set: (value) => {
        scrollTop = value;
      },
      configurable: true,
    });
    Object.defineProperty(viewport, 'scrollHeight', {
      get: () => scrollHeight,
      configurable: true,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      value: clientHeight,
      configurable: true,
    });

    const scrollToSpy = vi.fn(({ top }: { top: number; behavior: ScrollBehavior }) => {
      scrollTop = Math.max(0, top - clientHeight);
    });
    Object.defineProperty(viewport, 'scrollTo', {
      value: scrollToSpy,
      configurable: true,
    });

    // at bottom => following
    scrollTop = scrollHeight - clientHeight;
    viewport.dispatchEvent(new Event('scroll'));
    expect(storeRef?.getState().isAtBottom).toBe(true);

    // simulate layout shrink pinned at bottom: scrollHeight decreases and scrollTop rolls back accordingly
    scrollHeight = 880;
    scrollTop = scrollHeight - clientHeight;
    viewport.dispatchEvent(new Event('scroll'));
    expect(storeRef?.getState().isAtBottom).toBe(true);

    // later content grows; because following stayed ON, it should auto-scroll to keep bottom visible
    scrollHeight = 930;
    triggerResizeObservers();
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 930, behavior: 'auto' });
  });

  it('does not treat layout-driven scrollTop rollback as user scroll up', async () => {
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
    const clientHeight = 240;
    let scrollHeight = 900;
    let scrollTop = 0;

    Object.defineProperty(viewport, 'scrollTop', {
      get: () => scrollTop,
      set: (value) => {
        scrollTop = value;
      },
      configurable: true,
    });
    Object.defineProperty(viewport, 'scrollHeight', {
      get: () => scrollHeight,
      configurable: true,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      value: clientHeight,
      configurable: true,
    });

    const scrollToSpy = vi.fn(({ top }: { top: number; behavior: ScrollBehavior }) => {
      scrollTop = Math.max(0, top - clientHeight);
    });
    Object.defineProperty(viewport, 'scrollTo', {
      value: scrollToSpy,
      configurable: true,
    });

    // land at bottom
    scrollTop = scrollHeight - clientHeight;
    viewport.dispatchEvent(new Event('scroll'));
    expect(storeRef?.getState().isAtBottom).toBe(true);

    scrollToSpy.mockClear();

    // simulate layout shrink pinned at bottom: scrollHeight decreases and scrollTop rolls back accordingly
    scrollHeight = 880;
    scrollTop = scrollHeight - clientHeight;
    viewport.dispatchEvent(new Event('scroll'));
    expect(storeRef?.getState().isAtBottom).toBe(true);

    // already at bottom => should not spam scrollToBottom
    triggerResizeObservers();
    expect(scrollToSpy).not.toHaveBeenCalled();
  });
});
