import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('chat message performance contracts', () => {
  it('keeps markdown and reasoning rendering behind a lazy boundary', () => {
    const filePath = path.resolve(
      process.cwd(),
      'src/renderer/components/chat-pane/components/message/message-body.tsx'
    );
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toContain("import('./message-rich-part').then");
    expect(source).not.toContain("from '@moryflow/ui/ai/message';");
    expect(source).not.toContain("from '@moryflow/ui/ai/reasoning';");
  });

  it('avoids pulling the ui message barrel into chat message shell code', () => {
    const filePath = path.resolve(
      process.cwd(),
      'src/renderer/components/chat-pane/components/message/index.tsx'
    );
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).not.toContain("from '@moryflow/ui/ai/message';");
  });
});
