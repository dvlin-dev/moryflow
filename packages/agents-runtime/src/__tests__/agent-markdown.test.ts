import { describe, expect, it } from 'vitest';

import { parseAgentMarkdown } from '../agent-markdown';

describe('agent-markdown', () => {
  it('parses markdown without frontmatter', () => {
    const result = parseAgentMarkdown({
      content: 'You are a helpful assistant.',
      filePath: '/tmp/assistant.md',
    });
    expect(result.errors.length).toBe(0);
    expect(result.agent?.id).toBe('assistant');
    expect(result.agent?.systemPrompt).toBe('You are a helpful assistant.');
  });

  it('parses JSONC frontmatter and body', () => {
    const content = `---\n{\n  "id": "writer",\n  "name": "Writer",\n  "modelSettings": { "temperature": 0.2 }\n}\n---\nYou write succinctly.`;
    const result = parseAgentMarkdown({ content, filePath: 'writer.md' });
    expect(result.errors.length).toBe(0);
    expect(result.agent?.id).toBe('writer');
    expect(result.agent?.name).toBe('Writer');
    expect(result.agent?.systemPrompt).toBe('You write succinctly.');
    expect(result.agent?.modelSettings?.temperature).toBe(0.2);
  });

  it('returns error when system prompt missing', () => {
    const content = `---\n{ "id": "empty" }\n---\n`;
    const result = parseAgentMarkdown({ content, filePath: 'empty.md' });
    expect(result.errors).toContain('missing_system_prompt');
    expect(result.agent).toBeUndefined();
  });
});
