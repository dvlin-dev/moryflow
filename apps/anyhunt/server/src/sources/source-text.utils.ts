/**
 * [PROVIDES]: source text normalization / token estimate / checksum / keyword extraction
 * [DEPENDS]: node:crypto, @moryflow/api
 * [POS]: Sources 文本预处理工具
 */

import { createHash } from 'node:crypto';
import { normalizeIndexableText } from '@moryflow/api';

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
  'what',
  'when',
  'where',
  'which',
  'who',
  'how',
  'not',
  'all',
  'can',
  'had',
  'but',
  'are',
  'was',
  'been',
  'has',
  'its',
  'may',
  'would',
  'could',
  'should',
  'also',
  'than',
  'other',
  'some',
  'each',
  'only',
  'more',
  'very',
  'just',
  'there',
  'then',
]);

/** CJK Unicode ranges covering Chinese, Japanese, and Korean scripts. */
const CJK_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x3000, 0x303f], // CJK Punctuation
  [0x3040, 0x309f], // Hiragana
  [0x30a0, 0x30ff], // Katakana
  [0x31f0, 0x31ff], // Katakana Extension
  [0x3400, 0x4dbf], // CJK Extension A
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0xac00, 0xd7af], // Korean Syllables
  [0xf900, 0xfaff], // CJK Compatibility Ideographs
  [0xff00, 0xffef], // Fullwidth Forms
  [0x20000, 0x2a6df], // CJK Extension B
  [0x2a700, 0x2b73f], // CJK Extension C
  [0x2b740, 0x2b81f], // CJK Extension D
  [0x2b820, 0x2ceaf], // CJK Extension E
  [0x2ceb0, 0x2ebef], // CJK Extension F
];

export function isCjkCodePoint(codePoint: number): boolean {
  for (const [lo, hi] of CJK_RANGES) {
    if (codePoint >= lo && codePoint <= hi) {
      return true;
    }
  }
  return false;
}

export function normalizeSourceText(input: string): string {
  return normalizeIndexableText(input);
}

/**
 * Estimate the number of tokens in text using a mixed CJK/Latin heuristic.
 * CJK characters are estimated at 1.5 tokens each (cl100k_base average ~1.76x),
 * other characters at 0.25 tokens each (~4 chars per token for Latin text).
 */
export function estimateTextTokens(text: string): number {
  const normalized = text.trim();
  if (!normalized) {
    return 0;
  }

  let cjkChars = 0;
  let otherChars = 0;
  for (const char of normalized) {
    const code = char.codePointAt(0)!;
    if (isCjkCodePoint(code)) {
      cjkChars += 1;
    } else {
      otherChars += 1;
    }
  }

  const cjkTokens = Math.ceil(cjkChars * 1.5);
  const otherTokens = Math.ceil(otherChars / 4);
  return Math.max(1, cjkTokens + otherTokens);
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
