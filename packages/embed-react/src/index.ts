/**
 * [PROVIDES]: EmbedProvider/Embed/useEmbed 等 React API
 * [DEPENDS]: @moryflow/embed, ./components, ./hooks, ./context
 * [POS]: @moryflow/embed-react 包入口
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 packages/embed-react/CLAUDE.md
 */

// Re-export from core
export type { EmbedType, ProviderName, EmbedTheme, EmbedData, EmbedOptions } from '@moryflow/embed';
export { EmbedError, detectProvider, isSupported } from '@moryflow/embed';

// Components
export {
  EmbedProvider,
  type EmbedProviderProps,
  Embed,
  type EmbedProps,
  EmbedSkeleton,
  type EmbedSkeletonProps,
} from './components';

// Hooks
export { useEmbed, type UseEmbedOptions, type UseEmbedResult, useEmbedContext } from './hooks';

// Context
export { EmbedContext, type EmbedContextValue } from './context';
