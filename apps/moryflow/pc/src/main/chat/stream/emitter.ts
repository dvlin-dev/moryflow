/**
 * [PROVIDES]: UIMessageChunk 批量写出能力（统一错误边界）
 * [DEPENDS]: ai - UIMessageStreamWriter
 * [POS]: 对话流输出层，负责把 reducer 结果写入 writer
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { UIMessage, UIMessageChunk, UIMessageStreamWriter } from 'ai';

export const emitUiMessageChunks = ({
  writer,
  chunks,
  onChunkEmitted,
}: {
  writer: UIMessageStreamWriter<UIMessage>;
  chunks: UIMessageChunk[];
  onChunkEmitted?: (chunk: UIMessageChunk) => void;
}) => {
  for (const chunk of chunks) {
    try {
      writer.write(chunk);
      onChunkEmitted?.(chunk);
    } catch (error) {
      console.warn('[chat] failed to write UI chunk', error, chunk);
    }
  }
};
