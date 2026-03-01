import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';

import { sanitizePersistedUiMessages } from '../ui-message-sanitizer.js';

describe('sanitizePersistedUiMessages', () => {
  it('filters assistant placeholders without parts', () => {
    const messages = [
      {
        id: 'user-1',
        role: 'user',
        parts: [{ type: 'text', text: 'hello' }],
      },
      {
        id: 'assistant-empty',
        role: 'assistant',
        parts: [],
      },
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'world' }],
      },
    ] as UIMessage[];

    const sanitized = sanitizePersistedUiMessages(messages);

    expect(sanitized.map((message) => message.id)).toEqual(['user-1', 'assistant-1']);
  });

  it('keeps user empty messages unchanged', () => {
    const messages = [
      {
        id: 'user-empty',
        role: 'user',
        parts: [],
      },
    ] as UIMessage[];

    const sanitized = sanitizePersistedUiMessages(messages);

    expect(sanitized).toHaveLength(1);
    expect(sanitized[0]?.id).toBe('user-empty');
  });
});
