/**
 * [INPUT]: normalized source text + source metadata
 * [OUTPUT]: source chunk drafts (without embeddings)
 * [POS]: Sources 结构化切块服务
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Injectable } from '@nestjs/common';
import { extractRetrievableTextBlocks } from '@moryflow/api';
import type { SourceChunkDraft } from './sources.types';
import {
  estimateTextTokens,
  extractKeywords,
  isCjkCodePoint,
  normalizeSourceText,
} from './source-text.utils';

const SOFT_TARGET_TOKENS = 800;
const HARD_MAX_TOKENS = 1500;
const MIN_CHUNK_TOKENS = 200;
const CHUNK_OVERLAP_TOKENS = 120;

const nextCodePointIndex = (content: string, index: number): number => {
  if (index >= content.length) {
    return content.length;
  }
  const code = content.codePointAt(index);
  if (code === undefined) {
    return Math.min(index + 1, content.length);
  }
  return index + (code > 0xffff ? 2 : 1);
};

@Injectable()
export class SourceChunkingService {
  chunkText(text: string): SourceChunkDraft[] {
    const normalized = normalizeSourceText(text);
    if (!normalized) {
      return [];
    }

    const blocks = extractRetrievableTextBlocks(normalized);
    const chunks: SourceChunkDraft[] = [];
    let currentHeadingKey = '';
    let currentHeadingPath: string[] = [];
    let currentParts: string[] = [];
    let currentTokens = 0;
    let overlapBuffer = '';

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

      // Capture overlap for next chunk within same heading section.
      // Walk backwards from end, counting tokens via isCjkCodePoint to find
      // the start position of the last ~CHUNK_OVERLAP_TOKENS tokens.
      // Uses code point iteration to handle surrogate pairs (CJK Ext B-F).
      const overlapTarget = CHUNK_OVERLAP_TOKENS;
      const totalTokens = estimateTextTokens(content);
      if (totalTokens > overlapTarget) {
        let overlapStart = content.length;
        let cjkCount = 0;
        let otherCount = 0;
        for (let i = content.length - 1; i >= 0; i--) {
          const code = content.codePointAt(i);
          if (code === undefined) break;
          // Skip low surrogates (part of surrogate pair handled by high surrogate)
          if (code >= 0xdc00 && code <= 0xdfff) continue;
          if (isCjkCodePoint(code)) {
            cjkCount += 1;
          } else {
            otherCount += 1;
          }
          const tokens = Math.ceil(cjkCount * 1.5) + Math.ceil(otherCount / 4);
          if (tokens >= overlapTarget) {
            overlapStart = i;
            break;
          }
          overlapStart = i;
        }
        overlapBuffer = content.slice(overlapStart).trim();
      } else {
        // Content smaller than overlap target — don't overlap
        overlapBuffer = '';
      }

      currentParts = [];
      currentTokens = 0;
    };

    for (const block of blocks) {
      const headingKey = block.headingPath.join(' > ');
      const blockTokens = estimateTextTokens(block.content);

      if (currentParts.length > 0 && headingKey !== currentHeadingKey) {
        flush();
        // Cross-heading: clear overlap to avoid semantic pollution
        overlapBuffer = '';
      }

      currentHeadingKey = headingKey;
      currentHeadingPath = [...block.headingPath];

      if (blockTokens > HARD_MAX_TOKENS) {
        if (currentParts.length > 0) {
          flush();
        }
        overlapBuffer = '';

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

      // Inject overlap from previous chunk (same heading section only)
      // Only inject if it won't push current block past HARD_MAX
      if (currentParts.length === 0 && overlapBuffer) {
        const overlapTokens = estimateTextTokens(overlapBuffer);
        if (overlapTokens + blockTokens <= HARD_MAX_TOKENS) {
          currentParts.push(overlapBuffer);
          currentTokens = overlapTokens;
        }
        overlapBuffer = '';
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

  private forceSplitBlock(block: {
    headingPath: string[];
    content: string;
  }): SourceChunkDraft[] {
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
    // Split by sentence boundaries: CJK punctuation (with or without trailing space)
    // and Latin punctuation (with trailing space)
    const sentences = content
      .split(/(?<=[。！？])\s*|(?<=[.!?])\s+/)
      .filter(Boolean);
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

      // Incremental token count: avoid O(n²) re-estimation on growing string
      const nextTokens = current
        ? currentTokens + sentenceTokens + 1
        : sentenceTokens;
      if (nextTokens > HARD_MAX_TOKENS && currentTokens >= MIN_CHUNK_TOKENS) {
        chunks.push(current.trim());
        current = sentence;
        currentTokens = sentenceTokens;
        continue;
      }

      current = current ? `${current} ${sentence}` : sentence;
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
      // Find end position where token count reaches HARD_MAX.
      // Accumulate fractional token counts to avoid per-character Math.ceil rounding
      // (calling estimateTextTokens on single chars inflates Latin text ~3.3x).
      let end = start;
      let cjkCount = 0;
      let otherCount = 0;
      for (const char of content.slice(start)) {
        const code = char.codePointAt(0)!;
        if (isCjkCodePoint(code)) {
          cjkCount += 1;
        } else {
          otherCount += 1;
        }
        const tokens = Math.ceil(cjkCount * 1.5) + Math.ceil(otherCount / 4);
        end += char.length; // handles surrogate pairs
        if (tokens >= HARD_MAX_TOKENS && end > start + char.length) {
          break;
        }
      }
      end = start + Math.min(end - start, content.length - start);

      const chunk = content.slice(start, end).trim();
      if (chunk) {
        chunks.push(chunk);
      }
      if (end >= content.length) {
        break;
      }
      // Overlap: step back by CHUNK_OVERLAP_TOKENS worth of tokens (token-aware).
      // Walk backwards from `end` accumulating tokens until we reach the overlap target.
      let overlapEnd = end;
      let overlapCjk = 0;
      let overlapOther = 0;
      for (let i = end - 1; i >= start; i--) {
        const code = content.codePointAt(i);
        if (code === undefined) break;
        // Skip low surrogates (they're part of surrogate pairs handled by the high surrogate)
        if (code >= 0xdc00 && code <= 0xdfff) continue;
        if (isCjkCodePoint(code)) {
          overlapCjk += 1;
        } else {
          overlapOther += 1;
        }
        const overlapTokens =
          Math.ceil(overlapCjk * 1.5) + Math.ceil(overlapOther / 4);
        if (overlapTokens >= CHUNK_OVERLAP_TOKENS) {
          overlapEnd = i;
          break;
        }
        overlapEnd = i;
      }
      start = Math.max(nextCodePointIndex(content, start), overlapEnd);
    }

    return chunks;
  }
}
