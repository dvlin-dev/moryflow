/**
 * [PROVIDES]: useEmbedContext
 * [DEPENDS]: EmbedContext
 * [POS]: Embed React Context 读取
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 packages/embed-react/CLAUDE.md
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
