import { describe, expect, it } from 'vitest';
import type { ChatStatus, UIMessage } from 'ai';

import {
  resolveLastVisibleAssistantIndex,
  shouldRenderAssistantMessage,
  shouldShowAssistantLoadingPlaceholder,
} from './message-loading';

const buildMessage = (input: Partial<UIMessage>): UIMessage =>
  ({
    id: input.id ?? 'message-1',
    role: input.role ?? 'assistant',
    parts: input.parts ?? [],
  }) as UIMessage;

const evaluate = ({
  status,
  isLastMessage,
  message,
}: {
  status: ChatStatus;
  isLastMessage: boolean;
  message: UIMessage;
}) => shouldShowAssistantLoadingPlaceholder({ status, isLastMessage, message });

describe('shouldShowAssistantLoadingPlaceholder', () => {
  it('returns true only for the last empty assistant message while running', () => {
    const result = evaluate({
      status: 'streaming',
      isLastMessage: true,
      message: buildMessage({ role: 'assistant', parts: [] }),
    });

    expect(result).toBe(true);
  });

  it('returns false when chat is idle even if assistant message is empty', () => {
    const result = evaluate({
      status: 'ready',
      isLastMessage: true,
      message: buildMessage({ role: 'assistant', parts: [] }),
    });

    expect(result).toBe(false);
  });

  it('returns false when not the last message', () => {
    const result = evaluate({
      status: 'streaming',
      isLastMessage: false,
      message: buildMessage({ role: 'assistant', parts: [] }),
    });

    expect(result).toBe(false);
  });

  it('returns false for non-empty assistant messages', () => {
    const result = evaluate({
      status: 'streaming',
      isLastMessage: true,
      message: buildMessage({ role: 'assistant', parts: [{ type: 'text', text: 'done' }] }),
    });

    expect(result).toBe(false);
  });
});

describe('shouldRenderAssistantMessage', () => {
  it('keeps assistant message visible when it only contains file parts', () => {
    const result = shouldRenderAssistantMessage({
      status: 'ready',
      isLastMessage: true,
      message: buildMessage({
        role: 'assistant',
        parts: [{ type: 'file', url: 'vault://file.md', mediaType: 'text/markdown' } as never],
      }),
    });

    expect(result).toBe(true);
  });

  it('hides truly empty assistant message outside running state', () => {
    const result = shouldRenderAssistantMessage({
      status: 'ready',
      isLastMessage: true,
      message: buildMessage({ role: 'assistant', parts: [] }),
    });

    expect(result).toBe(false);
  });
});

describe('resolveLastVisibleAssistantIndex', () => {
  it('falls back to previous assistant when last placeholder is hidden', () => {
    const messages = [
      buildMessage({
        id: 'a-1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'answer' } as never],
      }),
      buildMessage({ id: 'a-2', role: 'assistant', parts: [] }),
    ];

    const index = resolveLastVisibleAssistantIndex({
      messages,
      status: 'ready',
    });

    expect(index).toBe(0);
  });

  it('keeps trailing placeholder as last assistant while streaming', () => {
    const messages = [
      buildMessage({
        id: 'a-1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'answer' } as never],
      }),
      buildMessage({ id: 'a-2', role: 'assistant', parts: [] }),
    ];

    const index = resolveLastVisibleAssistantIndex({
      messages,
      status: 'streaming',
    });

    expect(index).toBe(1);
  });
});
