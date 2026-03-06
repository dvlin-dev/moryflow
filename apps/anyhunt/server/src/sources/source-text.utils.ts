/**
 * [PROVIDES]: source text normalization / token estimate / checksum / keyword extraction
 * [DEPENDS]: node:crypto
 * [POS]: Sources 文本预处理工具
 */

import { createHash } from 'node:crypto';

const KEYWORD_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'that',
  'with',
  'this',
  'from',
  'have',
  'your',
  'into',
  'about',
  'were',
  'will',
  'they',
  'them',
  'http',
  'https',
]);

export function normalizeSourceText(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function estimateTextTokens(text: string): number {
  const normalized = text.trim();
  if (!normalized) {
    return 0;
  }

  return Math.max(1, Math.ceil(normalized.length / 4));
}

export function computeSourceChecksum(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function extractKeywords(text: string, limit = 20): string[] {
  const counts = new Map<string, number>();
  const normalized = text.toLowerCase();
  const matches = normalized.match(/[\p{L}\p{N}_-]{3,}/gu) ?? [];

  for (const token of matches) {
    if (KEYWORD_STOP_WORDS.has(token)) {
      continue;
    }

    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}
