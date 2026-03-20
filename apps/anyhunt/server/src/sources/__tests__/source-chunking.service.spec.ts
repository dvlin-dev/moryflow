import { describe, expect, it } from 'vitest';
import { SourceChunkingService } from '../source-chunking.service';

describe('SourceChunkingService', () => {
  const service = new SourceChunkingService();
  const buildParagraph = (prefix: string, count: number): string =>
    Array.from({ length: count }, (_, index) => `${prefix}_${index}`).join(' ');

  const hasIsolatedSurrogate = (value: string): boolean => {
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code >= 0xd800 && code <= 0xdbff) {
        const next = value.charCodeAt(index + 1);
        if (!(next >= 0xdc00 && next <= 0xdfff)) {
          return true;
        }
        index += 1;
        continue;
      }
      if (code >= 0xdc00 && code <= 0xdfff) {
        return true;
      }
    }
    return false;
  };

  it('按 heading 保留结构上下文，不跨 heading 混合 chunk', () => {
    const chunks = service.chunkText(
      `# Overview\n\nFirst paragraph.\n\n## Details\n\nSecond paragraph.`,
    );

    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.headingPath).toEqual(['Overview']);
    expect(chunks[0]?.content).toContain('Overview');
    expect(chunks[1]?.headingPath).toEqual(['Overview', 'Details']);
    expect(chunks[1]?.content).toContain('Details');
  });

  it('对超长内容执行强制切分', () => {
    const longText = `# Notes\n\n${'Long sentence. '.repeat(4000)}`;
    const chunks = service.chunkText(longText);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.content.length > 0)).toBe(true);
    expect(chunks[0]?.headingPath).toEqual(['Notes']);
  });

  it('在同 heading 内保留 overlap，但跨 heading 不复用 overlap', () => {
    const alphaTail = buildParagraph('alpha_tail', 320);
    const betaBody = buildParagraph('beta_body', 320);
    const chunks = service.chunkText(
      [
        '# Alpha',
        '',
        buildParagraph('alpha_p1', 320),
        '',
        buildParagraph('alpha_p2', 320),
        '',
        alphaTail,
        '',
        buildParagraph('alpha_p4', 320),
        '',
        '# Beta',
        '',
        betaBody,
        '',
        buildParagraph('beta_p2', 320),
        '',
        buildParagraph('beta_p3', 320),
      ].join('\n'),
    );

    const alphaChunks = chunks.filter(
      (chunk) => chunk.headingPath[0] === 'Alpha',
    );
    const betaChunks = chunks.filter(
      (chunk) => chunk.headingPath[0] === 'Beta',
    );
    const overlapProbe = alphaChunks[0]!.content.slice(-160).slice(16);

    expect(alphaChunks.length).toBeGreaterThan(1);
    expect(betaChunks.length).toBeGreaterThan(0);
    expect(alphaChunks[1]?.content).toContain(overlapProbe);
    expect(betaChunks[0]?.content).not.toContain(overlapProbe);
  });

  it('强制切分包含 CJK Ext-B 字符的超长内容时不会生成破损 surrogate', () => {
    const extBText = `# Unicode\n\n${'𠀀'.repeat(2200)}`;
    const chunks = service.chunkText(extBText);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.tokenCount <= 1500)).toBe(true);
    expect(chunks.every((chunk) => !hasIsolatedSurrogate(chunk.content))).toBe(
      true,
    );
  });

  it('forced split overlap fallback 不会从低代理项开始下一个 chunk', () => {
    const extBText = `# Unicode\n\n${'𠀀'.repeat(1602)}`;
    const chunks = service.chunkText(extBText);

    expect(chunks.length).toBeGreaterThan(1);
    expect(
      chunks.slice(1).every((chunk) => !hasIsolatedSurrogate(chunk.content)),
    ).toBe(true);
  });
});
