/**
 * [PROVIDES]: EmbedContext, EmbedContextValue
 * [DEPENDS]: @anyhunt/embed
 * [POS]: Embed React Context 定义
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 packages/embed-react/CLAUDE.md
 */

'use client';
import { createContext } from 'react';
import type { EmbedClient, EmbedTheme } from '@anyhunt/embed';

export interface EmbedContextValue {
  client: EmbedClient | null;
  theme?: EmbedTheme;
}

export const EmbedContext = createContext<EmbedContextValue>({
  client: null,
  theme: undefined,
});
