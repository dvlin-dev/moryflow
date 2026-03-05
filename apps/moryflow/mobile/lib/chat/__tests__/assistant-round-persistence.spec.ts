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
});
