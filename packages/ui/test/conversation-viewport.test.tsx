import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { ConversationViewport } from '../src/ai/conversation-viewport';
import { ConversationViewportSlack } from '../src/ai/conversation-viewport/slack';
import { useConversationViewportStore } from '../src/ai/conversation-viewport/context';

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

  useEffect(() => {
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

describe('ConversationViewportSlack', () => {
  it('applies minHeight by default', () => {
    render(
      <ConversationViewport>
        <StoreSeed viewport={400} inset={80} userMessage={120} />
        <ConversationViewportSlack data-testid="slack">
          <div>content</div>
        </ConversationViewportSlack>
      </ConversationViewport>
    );

    const slack = screen.getByTestId('slack');
    expect(slack.style.minHeight).toBe('200px');
  });

  it('does not apply minHeight when disabled', () => {
    render(
      <ConversationViewport>
        <StoreSeed viewport={400} inset={80} userMessage={120} />
        <ConversationViewportSlack enabled={false} data-testid="slack">
          <div>content</div>
        </ConversationViewportSlack>
      </ConversationViewport>
    );

    const slack = screen.getByTestId('slack');
    expect(slack.style.minHeight).toBe('');
  });
});

describe('ConversationViewport auto scroll', () => {
  it('disables auto scroll on user scroll up and restores at bottom', async () => {
    let storeRef: ReturnType<typeof useConversationViewportStore> | null = null;

    const StoreProbe = () => {
      const store = useConversationViewportStore();
      useEffect(() => {
        storeRef = store;
      }, [store]);
      return null;
    };

    render(
      <ConversationViewport>
        <StoreProbe />
        <div style={{ height: 400 }} />
      </ConversationViewport>
    );

    const viewport = screen.getByRole('log') as HTMLDivElement;

    Object.defineProperty(viewport, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(viewport, 'scrollHeight', { value: 300, configurable: true });

    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => resolve());
      } else {
        setTimeout(() => resolve(), 0);
      }
    });

    viewport.scrollTop = 200;
    fireEvent.scroll(viewport);
    expect(storeRef?.getState().autoScrollEnabled).toBe(true);

    viewport.scrollTop = 120;
    fireEvent.scroll(viewport);
    expect(storeRef?.getState().autoScrollEnabled).toBe(false);

    viewport.scrollTop = 200;
    fireEvent.scroll(viewport);
    expect(storeRef?.getState().autoScrollEnabled).toBe(true);
  });

  it('skips the next auto scroll when requested', async () => {
    let storeRef: ReturnType<typeof useConversationViewportStore> | null = null;
    let scrollCalls = 0;

    const StoreProbe = () => {
      const store = useConversationViewportStore();

      useEffect(() => {
        storeRef = store;
        const unsubscribe = store.getState().onScrollToBottom(() => {
          scrollCalls += 1;
        });
        return () => {
          unsubscribe();
        };
      }, [store]);

      return null;
    };

    const HeightSetter = ({ viewport }: { viewport: number }) => {
      const store = useConversationViewportStore();
      useEffect(() => {
        store.setState({
          height: {
            viewport,
            inset: 0,
            userMessage: 0,
          },
        });
      }, [store, viewport]);
      return null;
    };

    const { rerender } = render(
      <ConversationViewport>
        <StoreProbe />
        <HeightSetter viewport={200} />
        <div style={{ height: 400 }} />
      </ConversationViewport>
    );

    const nextFrame = () =>
      new Promise<void>((resolve) => {
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => resolve());
        } else {
          setTimeout(() => resolve(), 0);
        }
      });

    await act(async () => {
      await nextFrame();
    });

    const baselineCalls = scrollCalls;

    await act(async () => {
      storeRef?.getState().skipAutoScrollOnce();
      rerender(
        <ConversationViewport>
          <StoreProbe />
          <HeightSetter viewport={240} />
          <div style={{ height: 400 }} />
        </ConversationViewport>
      );
      await nextFrame();
    });

    expect(scrollCalls).toBe(baselineCalls);

    await act(async () => {
      storeRef?.getState().clearSkipAutoScroll();
      rerender(
        <ConversationViewport>
          <StoreProbe />
          <HeightSetter viewport={280} />
          <div style={{ height: 400 }} />
        </ConversationViewport>
      );
      await nextFrame();
    });

    expect(scrollCalls).toBe(baselineCalls + 1);
  });
});
