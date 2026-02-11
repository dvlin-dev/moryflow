import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';

import { createMessageMetadata, getMessageMeta } from './message';

describe('chat message metadata helpers', () => {
  it('keeps selected skill and attachments in metadata', () => {
    const metadata = createMessageMetadata({
      attachments: [
        {
          id: 'ref-1',
          type: 'file-ref',
          path: 'notes/today.md',
          name: 'today.md',
          extension: 'md',
        },
      ],
      selectedSkill: {
        name: 'better-auth-best-practices',
        title: 'Better Auth Best Practices',
      },
    });

    const message = {
      id: 'msg-1',
      role: 'user',
      parts: [{ type: 'text', text: 'hello' }],
      metadata,
    } as unknown as UIMessage;

    expect(getMessageMeta(message)).toEqual({
      attachments: [
        {
          id: 'ref-1',
          type: 'file-ref',
          path: 'notes/today.md',
          name: 'today.md',
          extension: 'md',
        },
      ],
      selectedSkill: {
        name: 'better-auth-best-practices',
        title: 'Better Auth Best Practices',
      },
    });
  });
});
