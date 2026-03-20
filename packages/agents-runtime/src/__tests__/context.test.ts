import { describe, expect, it } from 'vitest';
import { applyContextToInput } from '../context';

describe('applyContextToInput', () => {
  it('injects english llm-visible labels and selectedText context', () => {
    expect(
      applyContextToInput('Summarize this', {
        filePath: 'notes/today.md',
        selectedText: 'Focus on the TODO block.',
      })
    ).toBe(
      'Current file: notes/today.md\n\nUser-selected text:\nFocus on the TODO block.\n\n=== User input ===\nSummarize this'
    );
  });
});
