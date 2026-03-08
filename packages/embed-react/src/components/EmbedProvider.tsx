/**
 * [PROPS]: EmbedProviderProps
 * [EMITS]: none
 * [POS]: Embed Provider（注入 API Client 与主题）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

'use client';

import { useMemo, type ReactNode } from 'react';
import { createEmbedClient, type EmbedTheme } from '@moryflow/embed';
import { EmbedContext, type EmbedContextValue } from '../context';

export interface EmbedProviderProps {
  /** API Key */
  apiKey: string;
  /** API 基础 URL */
  baseUrl?: string;
  /** 全局主题 */
  theme?: EmbedTheme;
  children: ReactNode;
}

export function EmbedProvider({ apiKey, baseUrl, theme, children }: EmbedProviderProps) {
  const client = useMemo(() => createEmbedClient({ apiKey, baseUrl }), [apiKey, baseUrl]);
  const contextValue = useMemo<EmbedContextValue>(() => ({ client, theme }), [client, theme]);

  return <EmbedContext.Provider value={contextValue}>{children}</EmbedContext.Provider>;
}
