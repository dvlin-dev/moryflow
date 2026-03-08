/**
 * [PROVIDES]: useEmbedContext
 * [DEPENDS]: EmbedContext
 * [POS]: Embed React Context 读取
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

'use client';
import { useContext } from 'react';
import { EmbedContext, type EmbedContextValue } from '../context';

export function useEmbedContext(): EmbedContextValue {
  const context = useContext(EmbedContext);
  if (!context.client) {
    throw new Error('useEmbedContext must be used within an EmbedProvider');
  }
  return context;
}
