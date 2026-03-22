/**
 * [DEFINES]: 共享文本规范化与 retrievable block 提取纯函数
 * [USED_BY]: shared file-index classifier / Anyhunt chunking
 * [POS]: 可索引文本语义的唯一事实源
 *
 * [PROTOCOL]: 本文件变更时，必须同步更新：
 * - packages/api/src/file-index/index.ts
 * - packages/api/src/index.ts
 */

const ZERO_WIDTH_CHARACTERS = /(?:\u200B|\u200C|\u200D|\uFEFF)/g;
const WINDOWS_NEWLINES = /\r\n?/g;

export interface RetrievableTextBlock {
  headingPath: string[];
  content: string;
}

export function normalizeIndexableText(input: string): string {
  return input
    .replace(ZERO_WIDTH_CHARACTERS, '')
    .replace(WINDOWS_NEWLINES, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractRetrievableTextBlocks(input: string): RetrievableTextBlock[] {
  const text = normalizeIndexableText(input);
  if (!text) {
    return [];
  }

  const lines = text.split('\n');
  const blocks: RetrievableTextBlock[] = [];
  const headingPath: string[] = [];
  const paragraphLines: string[] = [];
  let inCodeFence = false;
  let codeFenceLines: string[] = [];

  const flushParagraph = () => {
    const content = paragraphLines.join('\n').trim();
    if (!content) {
      paragraphLines.length = 0;
      return;
    }

    blocks.push({
      headingPath: [...headingPath],
      content: decorateWithHeadingPath(headingPath, content),
    });
    paragraphLines.length = 0;
  };

  const flushCodeFence = () => {
    const content = codeFenceLines.join('\n').trim();
    if (!content) {
      codeFenceLines = [];
      return;
    }

    blocks.push({
      headingPath: [...headingPath],
      content: decorateWithHeadingPath(headingPath, content),
    });
    codeFenceLines = [];
  };

  for (const line of lines) {
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    const fenceLine = /^```/.test(line.trim());

    if (fenceLine) {
      if (inCodeFence) {
        codeFenceLines.push(line);
        flushCodeFence();
        inCodeFence = false;
      } else {
        flushParagraph();
        inCodeFence = true;
        codeFenceLines = [line];
      }
      continue;
    }

    if (inCodeFence) {
      codeFenceLines.push(line);
      continue;
    }

    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      headingPath.length = level - 1;
      headingPath[level - 1] = title;
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  if (inCodeFence) {
    flushCodeFence();
  }

  return blocks;
}

function decorateWithHeadingPath(headingPath: string[], content: string): string {
  if (headingPath.length === 0) {
    return content;
  }

  return `${headingPath.join(' > ')}\n\n${content}`;
}
