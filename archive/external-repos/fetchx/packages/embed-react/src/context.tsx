/**
 * Embed Context
 */
import { createContext } from 'react';
import type { EmbedClient, EmbedTheme } from '@aiget/embed';

export interface EmbedContextValue {
  client: EmbedClient | null;
  theme?: EmbedTheme;
}

export const EmbedContext = createContext<EmbedContextValue>({
  client: null,
  theme: undefined,
});
