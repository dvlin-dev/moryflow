import { describe, expect, it } from 'vitest';

import { cleanFileRefMarker, findLastTextPartIndex, splitMessageParts } from '../src/ai/message';

describe('cleanFileRefMarker', () => {
  it('strips referenced files marker at the end of the message', () => {
    expect(cleanFileRefMarker('Hello\n\n[Referenced files: a.md]')).toBe('Hello');
  });

  it('keeps message text when marker is not present', () => {
    expect(cleanFileRefMarker('Hello')).toBe('Hello');
  });
});

describe('splitMessageParts', () => {
  it('handles empty parts', () => {
    const result = splitMessageParts(undefined);
    expect(result.fileParts).toEqual([]);
    expect(result.orderedParts).toEqual([]);
    expect(result.messageText).toBe('');
  });

  it('splits file parts from ordered parts and joins text parts', () => {
    const parts = [
      { type: 'text', text: 'Hello' },
      { type: 'file', url: 'https://example.com/a.png', filename: 'a.png', mediaType: 'image/png' },
      { type: 'text', text: 'World' },
    ] as unknown as Parameters<typeof splitMessageParts>[0];

    const { fileParts, orderedParts, messageText } = splitMessageParts(parts);

    expect(fileParts).toHaveLength(1);
    expect(orderedParts.map((p) => p.type)).toEqual(['text', 'text']);
    expect(messageText).toBe('Hello\nWorld');
  });
});

describe('findLastTextPartIndex', () => {
  it('returns -1 when there are no text parts', () => {
    expect(findLastTextPartIndex([])).toBe(-1);
    expect(
      findLastTextPartIndex([{ type: 'tool' }, { type: 'reasoning' }] as unknown as Parameters<
        typeof findLastTextPartIndex
      >[0])
    ).toBe(-1);
  });

  it('returns the last text part index', () => {
    expect(
      findLastTextPartIndex([
        { type: 'text', text: 'a' },
        { type: 'tool' },
        { type: 'text', text: 'b' },
      ] as unknown as Parameters<typeof findLastTextPartIndex>[0])
    ).toBe(2);
  });
});
