import { describe, expect, it } from 'vitest';
import type { ChatStatus, UIMessage } from 'ai';

import {
  resolveLastVisibleAssistantIndex,
  shouldRenderAssistantMessage,
  shouldShowAssistantLoadingPlaceholder,
  shouldShowStreamingTail,
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

type Part = UIMessage['parts'][number];

describe('shouldShowStreamingTail', () => {
  const toolFinished = {
    type: 'tool-invocation',
    toolCallId: 't-1',
    toolName: 'bash',
    state: 'output-available',
    args: {},
    output: {},
  } as unknown as Part;

  const toolRunning = {
    ...toolFinished,
    state: 'input-available',
  } as unknown as Part;

  const reasoningDone = {
    type: 'reasoning',
    text: 'done thinking',
    state: 'done',
  } as unknown as Part;

  const reasoningStreaming = {
    type: 'reasoning',
    text: 'still thinking',
    state: 'streaming',
  } as unknown as Part;

  const textPart = {
    type: 'text',
    text: 'hello',
  } as unknown as Part;

  it('returns true when last part is a finished tool and still streaming', () => {
    expect(
      shouldShowStreamingTail({
        status: 'streaming',
        isLastMessage: true,
        lastOrderedPart: toolFinished,
        hasMessageParts: true,
      })
    ).toBe(true);
  });

  it('returns false when last part is a running tool', () => {
    expect(
      shouldShowStreamingTail({
        status: 'streaming',
        isLastMessage: true,
        lastOrderedPart: toolRunning,
        hasMessageParts: true,
      })
    ).toBe(false);
  });

  it('returns true when last part is done reasoning and still streaming', () => {
    expect(
      shouldShowStreamingTail({
        status: 'streaming',
        isLastMessage: true,
        lastOrderedPart: reasoningDone,
        hasMessageParts: true,
      })
    ).toBe(true);
  });

  it('returns false when last part is still-streaming reasoning', () => {
    expect(
      shouldShowStreamingTail({
        status: 'streaming',
        isLastMessage: true,
        lastOrderedPart: reasoningStreaming,
        hasMessageParts: true,
      })
    ).toBe(false);
  });

  it('returns false when last part is text', () => {
    expect(
      shouldShowStreamingTail({
        status: 'streaming',
        isLastMessage: true,
        lastOrderedPart: textPart,
        hasMessageParts: true,
      })
    ).toBe(false);
  });

  it('returns false when chat is not streaming', () => {
    expect(
      shouldShowStreamingTail({
        status: 'ready',
        isLastMessage: true,
        lastOrderedPart: toolFinished,
        hasMessageParts: true,
      })
    ).toBe(false);
  });

  it('returns false when not the last message', () => {
    expect(
      shouldShowStreamingTail({
        status: 'streaming',
        isLastMessage: false,
        lastOrderedPart: toolFinished,
        hasMessageParts: true,
      })
    ).toBe(false);
  });

  it('returns false when message is truly empty', () => {
    expect(
      shouldShowStreamingTail({
        status: 'streaming',
        isLastMessage: true,
        lastOrderedPart: undefined,
        hasMessageParts: false,
      })
    ).toBe(false);
  });

  it('returns true for file-only message during streaming', () => {
    expect(
      shouldShowStreamingTail({
        status: 'streaming',
        isLastMessage: true,
        lastOrderedPart: undefined,
        hasMessageParts: true,
      })
    ).toBe(true);
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
