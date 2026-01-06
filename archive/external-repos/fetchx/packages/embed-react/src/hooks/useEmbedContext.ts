/**
 * useEmbedContext hook
 */
import { useContext } from 'react';
import { EmbedContext, type EmbedContextValue } from '../context.tsx';

export function useEmbedContext(): EmbedContextValue {
  const context = useContext(EmbedContext);
  if (!context.client) {
    throw new Error('useEmbedContext must be used within an EmbedProvider');
  }
  return context;
}
