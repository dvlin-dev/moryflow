import { describe, expect, it } from 'vitest';
import { parseChatStreamChunk } from './stream-parser';

describe('parseChatStreamChunk', () => {
  it('解析内容片段和 usage', () => {
    const parsed = parseChatStreamChunk(
      [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}',
        'data: {"usage":{"prompt_tokens":12,"completion_tokens":8}}',
      ].join('\n')
    );

    expect(parsed.done).toBe(false);
    expect(parsed.contentSegments).toEqual(['Hello']);
    expect(parsed.usage).toEqual({ prompt: 12, completion: 8 });
  });

  it('遇到 [DONE] 时标记 done', () => {
    const parsed = parseChatStreamChunk('data: [DONE]');
    expect(parsed.done).toBe(true);
    expect(parsed.contentSegments).toEqual([]);
  });

  it('忽略非法 JSON 片段', () => {
    const parsed = parseChatStreamChunk('data: {not-json}\ndata: {"choices":[{"delta":{"content":"A"}}]}');
    expect(parsed.contentSegments).toEqual(['A']);
  });
});
