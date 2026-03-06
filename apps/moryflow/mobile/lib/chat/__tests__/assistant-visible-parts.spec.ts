import { describe, expect, it } from 'vitest';
import type { UIMessage } from '@ai-sdk/react';
import { filterVisibleAssistantParts } from '../assistant-visible-parts';

describe('filterVisibleAssistantParts', () => {
  it('hides prior ordered parts and keeps the final conclusion part visible', () => {
    const parts = [
      { type: 'reasoning', text: 'think', state: 'done' },
      { type: 'text', text: 'Final answer' },
    ] satisfies UIMessage['parts'];

    expect(filterVisibleAssistantParts(parts, new Set([0]))).toEqual([
      { type: 'text', text: 'Final answer' },
    ]);
  });

  it('does not count file parts toward hidden ordered part indexes', () => {
    const parts = [
      {
        type: 'file',
        filename: 'notes.md',
        mediaType: 'text/markdown',
        url: 'file:///notes.md',
      },
      { type: 'text', text: 'Final answer' },
    ] satisfies UIMessage['parts'];

    expect(filterVisibleAssistantParts(parts, new Set([0]))).toEqual([
      {
        type: 'file',
        filename: 'notes.md',
        mediaType: 'text/markdown',
        url: 'file:///notes.md',
      },
    ]);
  });
});
