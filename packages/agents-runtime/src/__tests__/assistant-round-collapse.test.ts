import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import {
  annotateLatestAssistantRoundMetadata,
  buildAssistantRoundRenderItems,
  formatAssistantRoundDuration,
  resolveAssistantRoundPreferenceScopeKey,
  resolveAssistantRounds,
} from '../ui-message/assistant-round-collapse';

const createMessage = (input: {
  id: string;
  role: UIMessage['role'];
  parts?: UIMessage['parts'];
  createdAt?: Date;
  metadata?: UIMessage['metadata'];
}): UIMessage => ({
  id: input.id,
  role: input.role,
  parts: input.parts ?? [],
  ...(input.createdAt ? { createdAt: input.createdAt } : {}),
  ...(input.metadata ? { metadata: input.metadata } : {}),
});

describe('assistant-round-collapse', () => {
  it('groups assistant messages by user boundary and ignores empty assistant placeholders', () => {
    const messages: UIMessage[] = [
      createMessage({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Q1' }] }),
      createMessage({ id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'A1' }] }),
      createMessage({ id: 'a2', role: 'assistant', parts: [{ type: 'text', text: 'A2' }] }),
      createMessage({ id: 'u2', role: 'user', parts: [{ type: 'text', text: 'Q2' }] }),
      createMessage({ id: 'loading', role: 'assistant', parts: [] }),
      createMessage({ id: 'a3', role: 'assistant', parts: [{ type: 'text', text: 'A3' }] }),
    ];

    const rounds = resolveAssistantRounds(messages);
    expect(rounds).toHaveLength(2);
    expect(rounds[0]).toMatchObject({
      firstAssistantIndex: 1,
      conclusionIndex: 2,
      processIndexes: [1],
      processCount: 1,
    });
    expect(rounds[1]).toMatchObject({
      firstAssistantIndex: 5,
      conclusionIndex: 5,
      processIndexes: [],
      processCount: 0,
    });
  });

  it('collapses process assistant messages after round finishes', () => {
    const messages: UIMessage[] = [
      createMessage({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Q' }] }),
      createMessage({ id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'A1' }] }),
      createMessage({ id: 'a2', role: 'assistant', parts: [{ type: 'text', text: 'A2' }] }),
      createMessage({ id: 'a3', role: 'assistant', parts: [{ type: 'text', text: 'A3' }] }),
    ];

    const result = buildAssistantRoundRenderItems({
      messages,
      status: 'ready',
    });

    expect(result.hiddenAssistantIndexSet.has(1)).toBe(true);
    expect(result.hiddenAssistantIndexSet.has(2)).toBe(true);
    expect(result.hiddenAssistantIndexSet.has(3)).toBe(false);
    expect(result.items.map((item) => item.type)).toEqual(['message', 'summary', 'message']);
    const summary = result.items.find((item) => item.type === 'summary');
    expect(summary && summary.type === 'summary' ? summary.round.processCount : -1).toBe(2);
  });

  it('collapses prior ordered parts inside the conclusion assistant message after round finishes', () => {
    const messages: UIMessage[] = [
      createMessage({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Q' }] }),
      createMessage({
        id: 'a1',
        role: 'assistant',
        parts: [
          { type: 'reasoning', text: 'think', state: 'done' },
          { type: 'text', text: 'Final answer' },
        ],
      }),
    ];

    const result = buildAssistantRoundRenderItems({
      messages,
      status: 'ready',
    });

    expect(result.hiddenAssistantIndexSet.size).toBe(0);
    expect(result.hiddenOrderedPartIndexesByMessageIndex.get(1)?.has(0)).toBe(true);
    expect(result.hiddenOrderedPartIndexesByMessageIndex.get(1)?.has(1)).toBe(false);
    expect(result.items.map((item) => item.type)).toEqual(['message', 'summary', 'message']);
    const summary = result.items.find((item) => item.type === 'summary');
    expect(
      summary && summary.type === 'summary' ? summary.round.summaryAnchorMessageIndex : -1
    ).toBe(1);
    expect(summary && summary.type === 'summary' ? summary.round.processCount : -1).toBe(1);
  });

  it('collapses prior assistant messages and prior ordered parts in the conclusion message together', () => {
    const messages: UIMessage[] = [
      createMessage({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Q' }] }),
      createMessage({ id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'step 1' }] }),
      createMessage({
        id: 'a2',
        role: 'assistant',
        parts: [
          {
            type: 'tool-list_dir',
            toolCallId: 'tool-1',
            state: 'output-available',
            input: {},
            output: {},
          },
          { type: 'text', text: 'Final answer' },
        ],
      }),
    ];

    const result = buildAssistantRoundRenderItems({
      messages,
      status: 'ready',
    });

    expect(result.hiddenAssistantIndexSet.has(1)).toBe(true);
    expect(result.hiddenOrderedPartIndexesByMessageIndex.get(2)?.has(0)).toBe(true);
    expect(result.hiddenOrderedPartIndexesByMessageIndex.get(2)?.has(1)).toBe(false);
    const summary = result.items.find((item) => item.type === 'summary');
    expect(
      summary && summary.type === 'summary' ? summary.round.summaryAnchorMessageIndex : -1
    ).toBe(1);
    expect(summary && summary.type === 'summary' ? summary.round.processCount : -1).toBe(2);
  });

  it('keeps current round fully expanded while streaming', () => {
    const messages: UIMessage[] = [
      createMessage({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Q' }] }),
      createMessage({ id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'A1' }] }),
      createMessage({ id: 'a2', role: 'assistant', parts: [{ type: 'text', text: 'A2' }] }),
    ];

    const result = buildAssistantRoundRenderItems({
      messages,
      status: 'streaming',
    });

    expect(result.hiddenAssistantIndexSet.size).toBe(0);
    expect(result.items.every((item) => item.type === 'message')).toBe(true);
  });

  it('keeps prior rounds collapsed before the next assistant token starts', () => {
    const messages: UIMessage[] = [
      createMessage({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Q1' }] }),
      createMessage({ id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'A1' }] }),
      createMessage({ id: 'a2', role: 'assistant', parts: [{ type: 'text', text: 'A2' }] }),
      createMessage({ id: 'u2', role: 'user', parts: [{ type: 'text', text: 'Q2' }] }),
    ];

    const result = buildAssistantRoundRenderItems({
      messages,
      status: 'submitted',
    });

    expect(result.hiddenAssistantIndexSet.has(1)).toBe(true);
    expect(result.hiddenAssistantIndexSet.has(2)).toBe(false);
    expect(result.items.map((item) => item.type)).toEqual([
      'message',
      'summary',
      'message',
      'message',
    ]);
    const summary = result.items.find((item) => item.type === 'summary');
    expect(summary && summary.type === 'summary' ? summary.collapsed : false).toBe(true);
  });

  it('respects manual expanded preference in finished rounds', () => {
    const messages: UIMessage[] = [
      createMessage({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Q' }] }),
      createMessage({ id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'A1' }] }),
      createMessage({ id: 'a2', role: 'assistant', parts: [{ type: 'text', text: 'A2' }] }),
    ];
    const roundId = resolveAssistantRounds(messages)[0]!.roundId;

    const result = buildAssistantRoundRenderItems({
      messages,
      status: 'ready',
      manualOpenPreferenceByRoundId: {
        [roundId]: true,
      },
    });

    expect(result.hiddenAssistantIndexSet.size).toBe(0);
    const summary = result.items.find((item) => item.type === 'summary');
    expect(summary && summary.type === 'summary' ? summary.open : false).toBe(true);
  });

  it('formats assistant round duration as compact text', () => {
    expect(formatAssistantRoundDuration(3_200)).toBe('3s');
    expect(formatAssistantRoundDuration(65_000)).toBe('1m 5s');
    expect(formatAssistantRoundDuration(3_600_000)).toBe('1h');
  });

  it('annotates latest round metadata onto conclusion assistant message', () => {
    const startedAt = new Date('2026-03-06T09:00:00.000Z');
    const finishedAt = new Date('2026-03-06T09:00:12.000Z');
    const messages: UIMessage[] = [
      createMessage({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Q' }] }),
      createMessage({
        id: 'a1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'A1' }],
        createdAt: startedAt,
      }),
      createMessage({
        id: 'a2',
        role: 'assistant',
        parts: [{ type: 'text', text: 'A2' }],
        createdAt: finishedAt,
      }),
    ];

    const result = annotateLatestAssistantRoundMetadata(messages, {
      finishedAt: finishedAt.getTime(),
    });
    expect(result.changed).toBe(true);
    const conclusion = result.messages[2]!;
    const metadata = (conclusion.metadata as Record<string, unknown> | undefined)?.chat as
      | Record<string, unknown>
      | undefined;
    const assistantRound = metadata?.assistantRound as Record<string, unknown> | undefined;
    expect(assistantRound?.version).toBe(1);
    expect(assistantRound?.roundId).toBe('a2');
    expect(assistantRound?.durationMs).toBe(12_000);
    expect(assistantRound?.processCount).toBe(1);
  });

  it('annotates processCount with both prior messages and prior conclusion ordered parts', () => {
    const startedAt = new Date('2026-03-06T09:00:00.000Z');
    const finishedAt = new Date('2026-03-06T09:00:12.000Z');
    const messages: UIMessage[] = [
      createMessage({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Q' }] }),
      createMessage({
        id: 'a1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'step 1' }],
        createdAt: startedAt,
      }),
      createMessage({
        id: 'a2',
        role: 'assistant',
        parts: [
          { type: 'reasoning', text: 'think', state: 'done' },
          { type: 'text', text: 'Final answer' },
        ],
        createdAt: finishedAt,
      }),
    ];

    const result = annotateLatestAssistantRoundMetadata(messages, {
      finishedAt: finishedAt.getTime(),
    });
    const conclusion = result.messages[2]!;
    const metadata = (conclusion.metadata as Record<string, unknown> | undefined)?.chat as
      | Record<string, unknown>
      | undefined;
    const assistantRound = metadata?.assistantRound as Record<string, unknown> | undefined;
    expect(assistantRound?.processCount).toBe(2);
  });

  it('prefers explicit round startedAt when latest messages do not carry createdAt', () => {
    const startedAt = Date.parse('2026-03-06T09:00:00.000Z');
    const finishedAt = Date.parse('2026-03-06T09:00:12.000Z');
    const messages: UIMessage[] = [
      createMessage({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Q' }] }),
      createMessage({ id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'A1' }] }),
      createMessage({ id: 'a2', role: 'assistant', parts: [{ type: 'text', text: 'A2' }] }),
    ];

    const result = annotateLatestAssistantRoundMetadata(messages, {
      startedAt,
      finishedAt,
    });
    const conclusion = result.messages[2]!;
    const metadata = (conclusion.metadata as Record<string, unknown> | undefined)?.chat as
      | Record<string, unknown>
      | undefined;
    const assistantRound = metadata?.assistantRound as Record<string, unknown> | undefined;
    expect(assistantRound?.startedAt).toBe(startedAt);
    expect(assistantRound?.finishedAt).toBe(finishedAt);
    expect(assistantRound?.durationMs).toBe(12_000);
  });

  it('omits summary duration when persisted durationMs is non-positive', () => {
    const fixedTime = Date.parse('2026-03-06T10:00:00.000Z');
    const messages: UIMessage[] = [
      createMessage({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Q' }] }),
      createMessage({
        id: 'a1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'A1' }],
      }),
      createMessage({
        id: 'a2',
        role: 'assistant',
        parts: [{ type: 'text', text: 'A2' }],
        metadata: {
          chat: {
            assistantRound: {
              version: 1,
              roundId: 'a2',
              startedAt: fixedTime,
              finishedAt: fixedTime,
              durationMs: 0,
              processCount: 1,
            },
          },
        },
      }),
    ];

    const result = buildAssistantRoundRenderItems({
      messages,
      status: 'ready',
    });
    const summary = result.items.find((item) => item.type === 'summary');
    expect(summary && summary.type === 'summary' ? summary.durationMs : undefined).toBeUndefined();
  });

  it('keeps existing round metadata when duration is 0ms', () => {
    const fixedTime = Date.parse('2026-03-06T10:00:00.000Z');
    const messages: UIMessage[] = [
      createMessage({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Q' }] }),
      createMessage({
        id: 'a1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'A1' }],
      }),
      createMessage({
        id: 'a2',
        role: 'assistant',
        parts: [{ type: 'text', text: 'A2' }],
        metadata: {
          chat: {
            assistantRound: {
              version: 1,
              roundId: 'a2',
              startedAt: fixedTime,
              finishedAt: fixedTime,
              durationMs: 0,
              processCount: 1,
            },
          },
        },
      }),
    ];

    const result = annotateLatestAssistantRoundMetadata(messages, { finishedAt: fixedTime });
    expect(result.changed).toBe(false);
    expect(result.messages).toBe(messages);
  });

  it('resolves round preference scope key from thread or first message identity', () => {
    const threadScoped = resolveAssistantRoundPreferenceScopeKey({
      threadId: 'thread-1',
      messages: [],
    });
    expect(threadScoped).toBe('thread:thread-1');

    const messageScoped = resolveAssistantRoundPreferenceScopeKey({
      messages: [
        createMessage({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Q' }] }),
        createMessage({ id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'A' }] }),
      ],
    });
    expect(messageScoped).toBe('message:u1');
  });
});
