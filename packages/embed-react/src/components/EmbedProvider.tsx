/**
 * EmbedProvider - 提供 Embed 客户端上下文
 */
import { useMemo, type ReactNode } from 'react';
import { createEmbedClient, type EmbedTheme } from '@aiget/embed';
import { EmbedContext, type EmbedContextValue } from '../context.tsx';

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
  const contextValue = useMemo<EmbedContextValue>(() => {
    const client = createEmbedClient({ apiKey, baseUrl });
    return { client, theme };
  }, [apiKey, baseUrl, theme]);

  return <EmbedContext.Provider value={contextValue}>{children}</EmbedContext.Provider>;
}
