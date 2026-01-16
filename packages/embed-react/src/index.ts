/**
 * /embed-react - React bindings for oEmbed API
 */

// Re-export from core
export type { EmbedType, ProviderName, EmbedTheme, EmbedData, EmbedOptions } from '@anyhunt/embed';
export { EmbedError, detectProvider, isSupported } from '@anyhunt/embed';

// Components
export {
  EmbedProvider,
  type EmbedProviderProps,
  Embed,
  type EmbedProps,
  EmbedSkeleton,
  type EmbedSkeletonProps,
} from './components/index.ts';

// Hooks
export {
  useEmbed,
  type UseEmbedOptions,
  type UseEmbedResult,
  useEmbedContext,
} from './hooks/index.ts';

// Context
export { EmbedContext, type EmbedContextValue } from './context.tsx';
