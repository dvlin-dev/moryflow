import { describe, expect, it } from 'vitest';
import { getMorySystemPrompt } from '../prompt';

describe('getMorySystemPrompt', () => {
  it('uses runtime-injected tool inventory wording instead of a fixed full list', () => {
    const prompt = getMorySystemPrompt();

    expect(prompt).toContain('可用工具清单以当前运行时实际注入为准');
    expect(prompt).not.toContain(
      '可用内置工具包括：read, edit, write, ls, glob, grep, search_in_file, move, delete, tasks_*, web_fetch, web_search, task。'
    );
  });
});
