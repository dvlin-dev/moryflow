import { describe, expect, it } from 'vitest';
import type { UIMessage } from '@ai-sdk/react';

import {
  resolveAssistantRoundTimingState,
  type AssistantRoundTimingState,
} from '../assistant-round-timing';

const createUserMessage = (id: string, text: string): UIMessage => ({
  id,
  role: 'user',
  parts: [{ type: 'text', text }],
});

const createAssistantMessage = (id: string, parts: UIMessage['parts']): UIMessage => ({
  id,
  role: 'assistant',
  parts,
});

describe('resolveAssistantRoundTimingState', () => {
  it('does not start timing when round is only submitted without assistant content', () => {
    const messages = [createUserMessage('u1', 'Q1')];

    const result = resolveAssistantRoundTimingState({
      previous: {},
      messages,
      status: 'submitted',
      now: 1_000,
    });

    expect(result).toEqual({
      roundKey: 'u1',
    });
  });

  it('starts timing when the first renderable assistant content appears', () => {
    const previous: AssistantRoundTimingState = {
      roundKey: 'u1',
    };
    const messages = [
      createUserMessage('u1', 'Q1'),
      createAssistantMessage('a1', [{ type: 'text', text: 'A1' }]),
    ];

    const result = resolveAssistantRoundTimingState({
      previous,
      messages,
      status: 'streaming',
      now: 2_000,
    });

    expect(result).toEqual({
      roundKey: 'u1',
      startedAt: 2_000,
    });
  });

  it('finishes timing from the first assistant content timestamp instead of running status start', () => {
    const previous: AssistantRoundTimingState = {
      roundKey: 'u1',
      startedAt: 2_000,
    };
    const messages = [
      createUserMessage('u1', 'Q1'),
      createAssistantMessage('a1', [{ type: 'text', text: 'A1' }]),
      createAssistantMessage('a2', [{ type: 'text', text: 'A2' }]),
    ];

    const result = resolveAssistantRoundTimingState({
      previous,
      messages,
      status: 'ready',
      now: 9_000,
    });

    expect(result).toEqual({
      roundKey: 'u1',
      startedAt: 2_000,
      finishedAt: 9_000,
    });
  });

  it('resets timing when a new user round begins in the same session', () => {
    const previous: AssistantRoundTimingState = {
      roundKey: 'u1',
      startedAt: 2_000,
      finishedAt: 9_000,
    };
    const messages = [
      createUserMessage('u1', 'Q1'),
      createAssistantMessage('a1', [{ type: 'text', text: 'A1' }]),
      createUserMessage('u2', 'Q2'),
    ];

    const result = resolveAssistantRoundTimingState({
      previous,
      messages,
      status: 'submitted',
      now: 12_000,
    });

    expect(result).toEqual({
      roundKey: 'u2',
    });
  });
});
