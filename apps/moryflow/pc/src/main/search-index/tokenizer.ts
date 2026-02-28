/**
 * [INPUT]: 原始检索文本与查询词
 * [OUTPUT]: exact/fuzzy FTS MATCH 查询串与 fuzzy token 流
 * [POS]: PC 全局搜索统一分词与查询构造器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

const TERM_REGEX = /[\p{L}\p{N}]+/gu;

const normalizeText = (text: string) => text.normalize('NFKC').toLowerCase();

const quoteToken = (token: string) => `"${token.replaceAll('"', '""')}"`;

const extractTerms = (input: string) => normalizeText(input).match(TERM_REGEX) ?? [];

const collectNgrams = (term: string, sink: string[], seen: Set<string>, maxTokens: number) => {
  const chars = Array.from(term);
  if (chars.length === 0) {
    return;
  }

  const push = (token: string) => {
    if (!token || seen.has(token) || sink.length >= maxTokens) {
      return;
    }
    seen.add(token);
    sink.push(token);
  };

  if (chars.length <= 2) {
    push(chars.join(''));
    return;
  }

  for (let index = 0; index <= chars.length - 2 && sink.length < maxTokens; index += 1) {
    push(chars.slice(index, index + 2).join(''));
  }

  for (let index = 0; index <= chars.length - 3 && sink.length < maxTokens; index += 1) {
    push(chars.slice(index, index + 3).join(''));
  }
};

export const buildExactMatchQuery = (query: string) => {
  const tokens = query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map(quoteToken);

  if (tokens.length === 0) {
    return null;
  }

  return tokens.join(' AND ');
};

export const buildFuzzyTokens = (input: string, maxTokens: number): string[] => {
  const terms = extractTerms(input);
  if (terms.length === 0 || maxTokens <= 0) {
    return [];
  }

  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const term of terms) {
    collectNgrams(term, tokens, seen, maxTokens);
    if (tokens.length >= maxTokens) {
      break;
    }
  }

  return tokens;
};

export const buildFuzzyTokenStream = (input: string, maxTokens: number) =>
  buildFuzzyTokens(input, maxTokens).join(' ');

export const buildFuzzyMatchQuery = (query: string, maxTokens: number) => {
  const tokens = buildFuzzyTokens(query, maxTokens);
  if (tokens.length === 0) {
    return null;
  }
  return tokens.map(quoteToken).join(' AND ');
};
