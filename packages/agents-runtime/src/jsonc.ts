/**
 * [PROVIDES]: JSONC 解析与更新工具
 * [DEPENDS]: jsonc-parser
 * [POS]: Permission/Config 等用户级 JSONC 配置的读写辅助
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { applyEdits, modify, parse, printParseErrorCode, type ParseError } from 'jsonc-parser';

type JsoncPath = Array<string | number>;

export type JsoncParseResult<T = unknown> = {
  data: T | null;
  errors: string[];
};

const normalizeJsonc = (input: string): string => {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return '{}\n';
  }
  return input;
};

export const parseJsonc = <T = unknown>(content: string): JsoncParseResult<T> => {
  const errors: ParseError[] = [];
  const data = parse(content, errors, { allowTrailingComma: true, disallowComments: false }) as T;
  const messages = errors.map((err) => printParseErrorCode(err.error));
  return { data: data ?? null, errors: messages };
};

export const updateJsoncValue = (content: string, path: JsoncPath, value: unknown): string => {
  const base = normalizeJsonc(content);
  const edits = modify(base, path, value, {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' },
  });
  const updated = applyEdits(base, edits);
  return updated.endsWith('\n') ? updated : `${updated}\n`;
};
