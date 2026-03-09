/**
 * [PROVIDES]: EmbedContext, EmbedContextValue
 * [DEPENDS]: @moryflow/embed
 * [POS]: Embed React Context 定义
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

'use client';
import { createContext } from 'react';
import type { EmbedClient, EmbedTheme } from '@moryflow/embed';

export interface EmbedContextValue {
  client: EmbedClient | null;
  theme?: EmbedTheme;
}

export const EmbedContext = createContext<EmbedContextValue>({
  client: null,
  theme: undefined,
});
