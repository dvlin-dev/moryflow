import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useLayoutEffect } from 'react';

import { ConversationViewport } from '../src/ai/conversation-viewport';
import { useConversationViewportStore } from '../src/ai/conversation-viewport/context';
import { emitAuiEvent } from '../src/ai/assistant-ui/utils/hooks/useAuiEvent';

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

  it('follows assistant tail only when it is not visible (turnAnchor=top)', async () => {
    let storeRef: ReturnType<typeof useConversationViewportStore> | null = null;

    render(
      <ConversationViewport data-testid="viewport" scrollToBottomOnRunStart={false}>
        <StoreSpy onStore={(store) => (storeRef = store)} />
        <div data-testid="tail" data-slot="conversation-tail" />
        <div data-testid="footer" data-slot="conversation-viewport-footer" />
      </ConversationViewport>
    );

    await waitFor(() => {
      expect(storeRef).not.toBeNull();
    });

    const viewport = screen.getByTestId('viewport') as HTMLDivElement;
    const tail = screen.getByTestId('tail') as HTMLDivElement;
    const footer = screen.getByTestId('footer') as HTMLDivElement;
    let tailBottom = 200;

    let scrollTop = 0;
    const clientHeight = 240;
    const scrollHeight = 900;

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
    const scrollToSpy = vi.fn(({ top }: { top: number }) => {
      scrollTop = Math.max(0, top - clientHeight);
    });
    Object.defineProperty(viewport, 'scrollTo', {
      value: scrollToSpy,
      configurable: true,
    });

    Object.defineProperty(viewport, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: clientHeight,
          height: clientHeight,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });
    Object.defineProperty(tail, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: tailBottom,
          height: 1,
          left: 0,
          right: 0,
          top: tailBottom - 1,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });

    Object.defineProperty(footer, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: clientHeight,
          height: 40,
          left: 0,
          right: 0,
          top: clientHeight,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });

    storeRef?.getState().registerUserMessageHeight().setHeight(120);
    triggerResizeObservers();
    triggerResizeObservers();

    act(() => {
      emitAuiEvent('thread.runStart');
    });

    triggerResizeObservers();
    expect(scrollToSpy).not.toHaveBeenCalled();

    tailBottom = 600;
    triggerResizeObservers();
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 900, behavior: 'auto' });
  });

  it('cancels follow after scrolling up >10px and restores via scrollToBottom', async () => {
    let storeRef: ReturnType<typeof useConversationViewportStore> | null = null;

    render(
      <ConversationViewport data-testid="viewport" scrollToBottomOnRunStart={false}>
        <StoreSpy onStore={(store) => (storeRef = store)} />
        <div data-testid="tail" data-slot="conversation-tail" />
        <div data-testid="footer" data-slot="conversation-viewport-footer" />
      </ConversationViewport>
    );

    await waitFor(() => {
      expect(storeRef).not.toBeNull();
    });

    const viewport = screen.getByTestId('viewport') as HTMLDivElement;
    const tail = screen.getByTestId('tail') as HTMLDivElement;
    const footer = screen.getByTestId('footer') as HTMLDivElement;
    const tailBottom = 600;

    let scrollTop = 0;
    const clientHeight = 240;
    const scrollHeight = 900;

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

    Object.defineProperty(viewport, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: clientHeight,
          height: clientHeight,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });
    Object.defineProperty(tail, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: tailBottom,
          height: 1,
          left: 0,
          right: 0,
          top: tailBottom - 1,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });

    Object.defineProperty(footer, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: clientHeight,
          height: 40,
          left: 0,
          right: 0,
          top: clientHeight,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });

    storeRef?.getState().registerUserMessageHeight().setHeight(120);
    triggerResizeObservers();
    triggerResizeObservers();

    act(() => {
      emitAuiEvent('thread.runStart');
    });

    triggerResizeObservers();
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 900, behavior: 'auto' });
    scrollToSpy.mockClear();

    scrollTop = scrollHeight - clientHeight - 11;
    viewport.dispatchEvent(new Event('scroll'));
    triggerResizeObservers();
    expect(scrollToSpy).not.toHaveBeenCalled();

    act(() => {
      storeRef?.getState().scrollToBottom();
    });
    triggerResizeObservers();
    triggerResizeObservers();
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 900, behavior: 'auto' });
  });

  it('does not run tail follow while runStart smooth scroll is active', async () => {
    let storeRef: ReturnType<typeof useConversationViewportStore> | null = null;

    render(
      <ConversationViewport data-testid="viewport">
        <StoreSpy onStore={(store) => (storeRef = store)} />
        <div data-testid="tail" data-slot="conversation-tail" />
        <div data-testid="footer" data-slot="conversation-viewport-footer" />
      </ConversationViewport>
    );

    await waitFor(() => {
      expect(storeRef).not.toBeNull();
    });

    const viewport = screen.getByTestId('viewport') as HTMLDivElement;
    const tail = screen.getByTestId('tail') as HTMLDivElement;
    const footer = screen.getByTestId('footer') as HTMLDivElement;
    const clientHeight = 240;
    const scrollHeight = 900;
    const tailBottom = 600;

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

    Object.defineProperty(viewport, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: clientHeight,
          height: clientHeight,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });
    Object.defineProperty(tail, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: tailBottom,
          height: 1,
          left: 0,
          right: 0,
          top: tailBottom - 1,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });

    Object.defineProperty(footer, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: clientHeight,
          height: 40,
          left: 0,
          right: 0,
          top: clientHeight,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });

    storeRef?.getState().registerUserMessageHeight().setHeight(120);
    triggerResizeObservers();
    triggerResizeObservers();

    act(() => {
      emitAuiEvent('thread.runStart');
    });
    triggerResizeObservers();

    expect(scrollToSpy).toHaveBeenCalled();
    expect(scrollToSpy.mock.calls.some((call) => call[0]?.behavior === 'instant')).toBe(false);
  });

  it('releases runStart scroll behavior after reaching bottom (turnAnchor=top)', async () => {
    let storeRef: ReturnType<typeof useConversationViewportStore> | null = null;

    render(
      <ConversationViewport data-testid="viewport">
        <StoreSpy onStore={(store) => (storeRef = store)} />
        <div data-testid="tail" data-slot="conversation-tail" />
        <div data-testid="footer" data-slot="conversation-viewport-footer" />
      </ConversationViewport>
    );

    await waitFor(() => {
      expect(storeRef).not.toBeNull();
    });

    const viewport = screen.getByTestId('viewport') as HTMLDivElement;
    const tail = screen.getByTestId('tail') as HTMLDivElement;
    const footer = screen.getByTestId('footer') as HTMLDivElement;

    let scrollTop = 0;
    const clientHeight = 240;
    const scrollHeight = 900;

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

    const scrollToSpy = vi.fn(({ top, behavior }: { top: number; behavior: ScrollBehavior }) => {
      if (behavior === 'auto') {
        scrollTop = Math.max(0, top - clientHeight);
      }
    });
    Object.defineProperty(viewport, 'scrollTo', {
      value: scrollToSpy,
      configurable: true,
    });

    Object.defineProperty(viewport, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: clientHeight,
          height: clientHeight,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });

    Object.defineProperty(tail, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: clientHeight,
          height: 1,
          left: 0,
          right: 0,
          top: clientHeight - 1,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });

    Object.defineProperty(footer, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: clientHeight,
          height: 40,
          left: 0,
          right: 0,
          top: clientHeight,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });

    storeRef?.getState().registerUserMessageHeight().setHeight(120);
    triggerResizeObservers();
    triggerResizeObservers();

    act(() => {
      emitAuiEvent('thread.runStart');
    });
    triggerResizeObservers();

    scrollToSpy.mockClear();
    triggerResizeObservers();
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('treats tail as visible when it is fully above the footer edge', async () => {
    let storeRef: ReturnType<typeof useConversationViewportStore> | null = null;

    render(
      <ConversationViewport data-testid="viewport" scrollToBottomOnRunStart={false}>
        <StoreSpy onStore={(store) => (storeRef = store)} />
        <div data-testid="tail" data-slot="conversation-tail" />
        <div data-testid="footer" data-slot="conversation-viewport-footer" />
      </ConversationViewport>
    );

    await waitFor(() => {
      expect(storeRef).not.toBeNull();
    });

    const viewport = screen.getByTestId('viewport') as HTMLDivElement;
    const tail = screen.getByTestId('tail') as HTMLDivElement;
    const footer = screen.getByTestId('footer') as HTMLDivElement;
    const clientHeight = 240;
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
    const scrollToSpy = vi.fn(({ top }: { top: number }) => {
      scrollTop = Math.max(0, top - clientHeight);
    });
    Object.defineProperty(viewport, 'scrollTo', {
      value: scrollToSpy,
      configurable: true,
    });

    Object.defineProperty(viewport, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: clientHeight,
          height: clientHeight,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });

    Object.defineProperty(footer, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: clientHeight,
          height: 40,
          left: 0,
          right: 0,
          top: clientHeight,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });

    // tail is fully visible (above footer edge)
    Object.defineProperty(tail, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: clientHeight,
          height: 1,
          left: 0,
          right: 0,
          top: clientHeight - 1,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });

    storeRef?.getState().registerUserMessageHeight().setHeight(120);
    triggerResizeObservers();
    triggerResizeObservers();

    act(() => {
      emitAuiEvent('thread.runStart');
    });

    triggerResizeObservers();
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('does not cancel follow on layout-driven scroll-top rollback', async () => {
    let storeRef: ReturnType<typeof useConversationViewportStore> | null = null;

    render(
      <ConversationViewport data-testid="viewport" scrollToBottomOnRunStart={false}>
        <StoreSpy onStore={(store) => (storeRef = store)} />
        <div data-testid="tail" data-slot="conversation-tail" />
        <div data-testid="footer" data-slot="conversation-viewport-footer" />
      </ConversationViewport>
    );

    await waitFor(() => {
      expect(storeRef).not.toBeNull();
    });

    const viewport = screen.getByTestId('viewport') as HTMLDivElement;
    const tail = screen.getByTestId('tail') as HTMLDivElement;
    const footer = screen.getByTestId('footer') as HTMLDivElement;
    const clientHeight = 240;

    let scrollTop = 0;
    let scrollHeight = 900;
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
    const scrollToSpy = vi.fn(({ top }: { top: number }) => {
      scrollTop = Math.max(0, top - clientHeight);
    });
    Object.defineProperty(viewport, 'scrollTo', {
      value: scrollToSpy,
      configurable: true,
    });

    Object.defineProperty(viewport, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: clientHeight,
          height: clientHeight,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });
    Object.defineProperty(footer, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: clientHeight,
          height: 40,
          left: 0,
          right: 0,
          top: clientHeight,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });

    // tail remains not visible so follow would normally keep running
    Object.defineProperty(tail, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: 600,
          height: 1,
          left: 0,
          right: 0,
          top: 599,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });

    storeRef?.getState().registerUserMessageHeight().setHeight(120);
    triggerResizeObservers();
    triggerResizeObservers();

    act(() => {
      emitAuiEvent('thread.runStart');
    });
    triggerResizeObservers();

    // follow should have scrolled to bottom once
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 900, behavior: 'auto' });
    scrollToSpy.mockClear();

    // simulate layout shrink: scrollHeight decreases and scrollTop rolls back while still at bottom
    scrollTop = 660;
    scrollHeight = 880;
    viewport.dispatchEvent(new Event('scroll'));

    // follow should still be active and allowed; another resize should keep following
    triggerResizeObservers();
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 880, behavior: 'auto' });
  });

  it('does not allow thread.initialize to override runStart scroll behavior', async () => {
    let storeRef: ReturnType<typeof useConversationViewportStore> | null = null;

    render(
      <ConversationViewport data-testid="viewport">
        <StoreSpy onStore={(store) => (storeRef = store)} />
        <div data-testid="tail" data-slot="conversation-tail" />
        <div data-testid="footer" data-slot="conversation-viewport-footer" />
      </ConversationViewport>
    );

    await waitFor(() => {
      expect(storeRef).not.toBeNull();
    });

    const viewport = screen.getByTestId('viewport') as HTMLDivElement;
    const tail = screen.getByTestId('tail') as HTMLDivElement;
    const footer = screen.getByTestId('footer') as HTMLDivElement;
    const clientHeight = 240;
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

    const scrollToSpy = vi.fn(({ top, behavior }: { top: number; behavior: ScrollBehavior }) => {
      if (behavior === 'instant') {
        throw new Error('thread.initialize should not call instant scroll during runStart');
      }
      scrollTop = Math.max(0, top - clientHeight);
    });
    Object.defineProperty(viewport, 'scrollTo', {
      value: scrollToSpy,
      configurable: true,
    });

    Object.defineProperty(viewport, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: clientHeight,
          height: clientHeight,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });
    Object.defineProperty(footer, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: clientHeight,
          height: 40,
          left: 0,
          right: 0,
          top: clientHeight,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });
    Object.defineProperty(tail, 'getBoundingClientRect', {
      value: () =>
        ({
          bottom: 600,
          height: 1,
          left: 0,
          right: 0,
          top: 599,
          width: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });

    storeRef?.getState().registerUserMessageHeight().setHeight(120);
    triggerResizeObservers();
    triggerResizeObservers();

    act(() => {
      emitAuiEvent('thread.runStart');
      emitAuiEvent('thread.initialize');
    });
    triggerResizeObservers();

    expect(scrollToSpy).toHaveBeenCalled();
  });
});
