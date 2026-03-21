import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { highlightCode } from '../src/ai/code-block';

describe('code-block implementation contracts', () => {
  it('uses shiki core modules instead of importing the full shiki bundle', () => {
    const filePath = path.resolve(process.cwd(), 'src/ai/code-block.tsx');
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).not.toContain("from 'shiki';");
    expect(source).toContain("from 'shiki/core';");
    expect(source).toContain("from 'shiki/langs';");
    expect(source).toContain("from 'shiki/themes';");
    expect(source).toContain("from 'shiki/engine/javascript';");
  });

  it('renders unknown languages as plain code instead of markdown-highlighted content', async () => {
    const [lightHtml, darkHtml] = await highlightCode(
      '# Heading\n- list item',
      'unknown-language' as never
    );

    expect(lightHtml).not.toContain('style="color:');
    expect(darkHtml).not.toContain('style="color:');
    expect(lightHtml).toContain('# Heading');
    expect(darkHtml).toContain('- list item');
  });
});
