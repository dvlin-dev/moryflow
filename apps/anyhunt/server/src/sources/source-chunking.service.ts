/**
 * [INPUT]: normalized source text + source metadata
 * [OUTPUT]: source chunk drafts (without embeddings)
 * [POS]: Sources 结构化切块服务
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Injectable } from '@nestjs/common';
import type { SourceChunkDraft } from './sources.types';
import {
  estimateTextTokens,
  extractKeywords,
  normalizeSourceText,
} from './source-text.utils';

const SOFT_TARGET_TOKENS = 700;
const HARD_MAX_TOKENS = 1000;
const MIN_CHUNK_TOKENS = 200;
const FORCED_SPLIT_OVERLAP_CHARS = 120 * 4;
const FORCED_SPLIT_WINDOW_CHARS = 1000 * 4;

interface TextBlock {
  headingPath: string[];
  content: string;
}

@Injectable()
export class SourceChunkingService {
  chunkText(text: string): SourceChunkDraft[] {
    const normalized = normalizeSourceText(text);
    if (!normalized) {
      return [];
    }

    const blocks = this.parseBlocks(normalized);
    const chunks: SourceChunkDraft[] = [];
    let currentHeadingKey = '';
    let currentHeadingPath: string[] = [];
    let currentParts: string[] = [];
    let currentTokens = 0;

    const flush = () => {
      const content = currentParts.join('\n\n').trim();
      if (!content) {
        currentParts = [];
        currentTokens = 0;
        return;
      }

      chunks.push({
        headingPath: [...currentHeadingPath],
        content,
        tokenCount: estimateTextTokens(content),
        keywords: extractKeywords(content),
      });
      currentParts = [];
      currentTokens = 0;
    };

    for (const block of blocks) {
      const headingKey = block.headingPath.join(' > ');
      const blockTokens = estimateTextTokens(block.content);

      if (currentParts.length > 0 && headingKey !== currentHeadingKey) {
        flush();
      }

      currentHeadingKey = headingKey;
      currentHeadingPath = [...block.headingPath];

      if (blockTokens > HARD_MAX_TOKENS) {
        if (currentParts.length > 0) {
          flush();
        }

        const forcedChunks = this.forceSplitBlock(block);
        chunks.push(...forcedChunks);
        currentHeadingKey = '';
        currentHeadingPath = [];
        continue;
      }

      const wouldExceedHardMax = currentTokens + blockTokens > HARD_MAX_TOKENS;
      const reachedSoftTarget = currentTokens >= SOFT_TARGET_TOKENS;

      if (
        currentParts.length > 0 &&
        wouldExceedHardMax &&
        currentTokens >= MIN_CHUNK_TOKENS
      ) {
        flush();
      } else if (currentParts.length > 0 && reachedSoftTarget) {
        flush();
      }

      currentParts.push(block.content);
      currentTokens += blockTokens;
    }

    flush();

    return chunks.map((chunk) => ({
      ...chunk,
      tokenCount: estimateTextTokens(chunk.content),
      keywords: extractKeywords(chunk.content),
    }));
  }

  private parseBlocks(text: string): TextBlock[] {
    const lines = text.split('\n');
    const blocks: TextBlock[] = [];
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
        content: this.decorateWithHeadingPath(headingPath, content),
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
        content: this.decorateWithHeadingPath(headingPath, content),
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

  private decorateWithHeadingPath(
    headingPath: string[],
    content: string,
  ): string {
    if (headingPath.length === 0) {
      return content;
    }

    return `${headingPath.join(' > ')}\n\n${content}`;
  }

  private forceSplitBlock(block: TextBlock): SourceChunkDraft[] {
    const chunks: SourceChunkDraft[] = [];
    const segments = this.splitLongText(block.content);

    for (const segment of segments) {
      const normalized = normalizeSourceText(segment);
      if (!normalized) {
        continue;
      }

      chunks.push({
        headingPath: [...block.headingPath],
        content: normalized,
        tokenCount: estimateTextTokens(normalized),
        keywords: extractKeywords(normalized),
      });
    }

    return chunks;
  }

  private splitLongText(content: string): string[] {
    const sentences = content.split(/(?<=[。！？.!?])\s+/).filter(Boolean);
    if (sentences.length <= 1) {
      return this.splitByWindow(content);
    }

    const chunks: string[] = [];
    let current = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = estimateTextTokens(sentence);
      if (sentenceTokens > HARD_MAX_TOKENS) {
        if (current.trim()) {
          chunks.push(current.trim());
          current = '';
          currentTokens = 0;
        }
        chunks.push(...this.splitByWindow(sentence));
        continue;
      }

      const next = current ? `${current} ${sentence}` : sentence;
      const nextTokens = estimateTextTokens(next);
      if (nextTokens > HARD_MAX_TOKENS && currentTokens >= MIN_CHUNK_TOKENS) {
        chunks.push(current.trim());
        current = sentence;
        currentTokens = sentenceTokens;
        continue;
      }

      current = next;
      currentTokens = nextTokens;
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }

    return chunks;
  }

  private splitByWindow(content: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < content.length) {
      const end = Math.min(content.length, start + FORCED_SPLIT_WINDOW_CHARS);
      const chunk = content.slice(start, end).trim();
      if (chunk) {
        chunks.push(chunk);
      }
      if (end >= content.length) {
        break;
      }
      start = Math.max(0, end - FORCED_SPLIT_OVERLAP_CHARS);
    }

    return chunks;
  }
}
