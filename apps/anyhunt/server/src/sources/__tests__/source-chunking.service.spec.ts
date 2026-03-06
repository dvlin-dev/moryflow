import { describe, expect, it } from 'vitest';
import { SourceChunkingService } from '../source-chunking.service';

describe('SourceChunkingService', () => {
  const service = new SourceChunkingService();

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
});
