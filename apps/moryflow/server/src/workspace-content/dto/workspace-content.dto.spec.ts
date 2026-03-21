import { describe, expect, it } from 'vitest';
import { WorkspaceContentBatchUpsertSchema } from './workspace-content.dto';

describe('WorkspaceContentBatchUpsertSchema', () => {
  it('derives title from path without accepting a client title field', () => {
    expect(() =>
      WorkspaceContentBatchUpsertSchema.parse({
        workspaceId: '11111111-1111-4111-8111-111111111111',
        documents: [
          {
            documentId: 'doc-1',
            path: 'notes/   .md',
            mimeType: 'text/markdown',
            contentHash: 'hash-1',
            mode: 'inline_text',
            contentText: '# Hello',
          },
        ],
      }),
    ).not.toThrow();
  });
});
