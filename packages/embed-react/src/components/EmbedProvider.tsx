/**
 * [PROPS]: EmbedProviderProps
 * [EMITS]: none
 * [POS]: Embed Provider（注入 API Client 与主题）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 packages/embed-react/CLAUDE.md
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
