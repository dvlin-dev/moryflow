import { describe, expect, it } from 'vitest';
import type { AgentInputItem } from '@openai/agents-core';

import { agentHistoryToUiMessages } from './ui-message.js';

describe('agentHistoryToUiMessages', () => {
  it('maps reasoning_text to reasoning UI part', () => {
    const history: AgentInputItem[] = [
      {
        role: 'assistant',
        content: [{ type: 'reasoning_text', text: 'step-by-step' }],
      } as AgentInputItem,
    ];

    const messages = agentHistoryToUiMessages('session_1', history);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.parts).toEqual([
      { type: 'reasoning', text: 'step-by-step', state: 'done' },
    ]);
  });

  it('keeps input/output text as text UI part', () => {
    const history: AgentInputItem[] = [
      {
        role: 'assistant',
        content: [
          { type: 'input_text', text: 'hello' },
          { type: 'output_text', text: 'world' },
        ],
      } as AgentInputItem,
    ];

    const messages = agentHistoryToUiMessages('session_1', history);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.parts).toEqual([
      { type: 'text', text: 'hello' },
      { type: 'text', text: 'world' },
    ]);
  });
});
