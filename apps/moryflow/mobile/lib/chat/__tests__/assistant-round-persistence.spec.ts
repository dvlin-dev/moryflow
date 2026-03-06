import { describe, expect, it } from 'vitest';
import type { UIMessage } from '@ai-sdk/react';
import { resolveMessagesWithAssistantRoundMetadata } from '../../../components/chat/hooks/assistant-round-persistence';

const createMessages = (): UIMessage[] => [
  {
    id: 'u1',
    role: 'user',
    parts: [{ type: 'text', text: 'Q' }],
  },
  {
    id: 'a1',
    role: 'assistant',
    parts: [{ type: 'text', text: 'A1' }],
  },
  {
    id: 'a2',
    role: 'assistant',
    parts: [{ type: 'text', text: 'A2' }],
  },
];

describe('resolveMessagesWithAssistantRoundMetadata', () => {
  it('does not annotate while round is running', () => {
    const messages = createMessages();
    const result = resolveMessagesWithAssistantRoundMetadata(messages, 'streaming');

    expect(result.changed).toBe(false);
    expect(result.messages).toBe(messages);
  });

  it('annotates latest assistant round when round finishes', () => {
    const messages = createMessages();
    const result = resolveMessagesWithAssistantRoundMetadata(messages, 'ready');

    expect(result.changed).toBe(true);
    const conclusion = result.messages[2];
    const assistantRound = (
      conclusion.metadata as { chat?: { assistantRound?: { processCount?: number } } }
    )?.chat?.assistantRound;
    expect(assistantRound?.processCount).toBe(1);
  });

  it('counts both prior assistant messages and prior conclusion parts as processCount', () => {
    const messages: UIMessage[] = [
      {
        id: 'u1',
        role: 'user',
        parts: [{ type: 'text', text: 'Q' }],
      },
      {
        id: 'a1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'step 1' }],
      },
      {
        id: 'a2',
        role: 'assistant',
        parts: [
          { type: 'reasoning', text: 'think', state: 'done' },
          { type: 'text', text: 'Final answer' },
        ],
      },
    ];

    const result = resolveMessagesWithAssistantRoundMetadata(messages, 'ready');
    const conclusion = result.messages[2];
    const assistantRound = (
      conclusion.metadata as { chat?: { assistantRound?: { processCount?: number } } }
    )?.chat?.assistantRound;
    expect(assistantRound?.processCount).toBe(2);
  });

  it('uses explicit round timestamps when messages do not carry createdAt', () => {
    const startedAt = Date.parse('2026-03-06T09:00:00.000Z');
    const finishedAt = Date.parse('2026-03-06T09:00:12.000Z');
    const messages = createMessages();

    const result = resolveMessagesWithAssistantRoundMetadata(messages, 'ready', {
      startedAt,
      finishedAt,
    });
    const conclusion = result.messages[2];
    const assistantRound = (
      conclusion.metadata as {
        chat?: {
          assistantRound?: { startedAt?: number; finishedAt?: number; durationMs?: number };
        };
      }
    )?.chat?.assistantRound;

    expect(assistantRound?.startedAt).toBe(startedAt);
    expect(assistantRound?.finishedAt).toBe(finishedAt);
    expect(assistantRound?.durationMs).toBe(12_000);
  });
});
