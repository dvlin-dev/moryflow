import { describe, expect, it } from 'vitest';
import type { ChatStatus, UIMessage } from 'ai';
import {
  resolveLastVisibleAssistantIndex,
  shouldRenderAssistantMessage,
  shouldShowAssistantLoadingPlaceholder,
} from '../ui-message/assistant-placeholder-policy';

const buildMessage = (input: Partial<UIMessage>): UIMessage =>
  ({
    id: input.id ?? 'message-1',
    role: input.role ?? 'assistant',
    parts: input.parts ?? [],
  }) as UIMessage;

const evaluatePlaceholder = ({
  status,
  isLastMessage,
  message,
}: {
  status: ChatStatus;
  isLastMessage: boolean;
  message: UIMessage;
}) => shouldShowAssistantLoadingPlaceholder({ status, isLastMessage, message });

describe('ui-message assistant-placeholder-policy', () => {
  it('shows loading placeholder only for the last empty assistant while running', () => {
    expect(
      evaluatePlaceholder({
        status: 'streaming',
        isLastMessage: true,
        message: buildMessage({ role: 'assistant', parts: [] }),
      })
    ).toBe(true);

    expect(
      evaluatePlaceholder({
        status: 'ready',
        isLastMessage: true,
        message: buildMessage({ role: 'assistant', parts: [] }),
      })
    ).toBe(false);

    expect(
      evaluatePlaceholder({
        status: 'streaming',
        isLastMessage: false,
        message: buildMessage({ role: 'assistant', parts: [] }),
      })
    ).toBe(false);
  });

  it('keeps assistant with real parts visible and hides empty one outside running state', () => {
    expect(
      shouldRenderAssistantMessage({
        status: 'ready',
        isLastMessage: true,
        message: buildMessage({
          role: 'assistant',
          parts: [{ type: 'file', url: 'vault://demo.md', mediaType: 'text/markdown' } as never],
        }),
      })
    ).toBe(true);

    expect(
      shouldRenderAssistantMessage({
        status: 'ready',
        isLastMessage: true,
        message: buildMessage({ role: 'assistant', parts: [] }),
      })
    ).toBe(false);
  });

  it('computes the last visible assistant index with hidden placeholder support', () => {
    const messages = [
      buildMessage({
        id: 'a-1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'answer' } as never],
      }),
      buildMessage({ id: 'a-2', role: 'assistant', parts: [] }),
    ];

    expect(
      resolveLastVisibleAssistantIndex({
        messages,
        status: 'ready',
      })
    ).toBe(0);

    expect(
      resolveLastVisibleAssistantIndex({
        messages,
        status: 'streaming',
      })
    ).toBe(1);
  });
});
