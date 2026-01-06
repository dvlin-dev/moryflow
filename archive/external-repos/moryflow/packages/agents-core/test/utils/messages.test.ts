import { describe, it, expect } from 'vitest';
import {
  getLastTextFromOutputMessage,
  getOutputText,
} from '../../src/utils/messages';
import type { ResponseOutputItem } from '../../src/types';
import { Usage } from '../../src/usage';
import type { ModelResponse } from '../../src/model';

describe('utils/messages', () => {
  it('returns undefined when item is not assistant message', () => {
    const nonMsg: ResponseOutputItem = {
      type: 'hosted_tool_call',
      name: 'x',
      status: 'completed',
    } as any;
    expect(getLastTextFromOutputMessage(nonMsg)).toBeUndefined();

    const userMsg: ResponseOutputItem = {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: 'a' }],
    } as any;
    expect(getLastTextFromOutputMessage(userMsg)).toBeUndefined();
  });

  it('gets last text from assistant message', () => {
    const item: ResponseOutputItem = {
      type: 'message',
      role: 'assistant',
      status: 'completed',
      content: [
        { type: 'output_text', text: 'a' },
        { type: 'output_text', text: 'b' },
      ],
    } as any;
    expect(getLastTextFromOutputMessage(item)).toBe('b');
  });

  it('getOutputText returns last assistant text', () => {
    const response: ModelResponse = {
      usage: new Usage(),
      output: [
        {
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [{ type: 'output_text', text: 'final' }],
        } as any,
      ],
    };
    expect(getOutputText(response)).toBe('final');
  });

  it('getOutputText returns empty string when output is empty', () => {
    const response: ModelResponse = {
      usage: new Usage(),
      output: [],
    };
    expect(getOutputText(response)).toBe('');
  });
});
