import { describe, expect, it } from 'vitest';
import { toSqlJson } from '../memory-json.utils';

function toSqlText(query: unknown): string {
  const raw = query as {
    sql?: string;
    text?: string;
    strings?: string[];
  };

  if (typeof raw.sql === 'string') {
    return raw.sql;
  }
  if (typeof raw.text === 'string') {
    return raw.text;
  }
  if (Array.isArray(raw.strings)) {
    return raw.strings.join('?');
  }

  return '';
}

describe('memory-json utils', () => {
  it('casts SQL JSON payloads as jsonb', () => {
    const sql = toSqlJson({ mode: 'metadata-update' });

    expect(toSqlText(sql)).toContain('::jsonb');
  });
});
