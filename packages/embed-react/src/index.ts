/**
 * [PROVIDES]: EmbedProvider/Embed/useEmbed 等 React API
 * [DEPENDS]: @anyhunt/embed, ./components, ./hooks, ./context
 * [POS]: @anyhunt/embed-react 包入口
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 packages/embed-react/CLAUDE.md
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
} from './components';

// Hooks
export { useEmbed, type UseEmbedOptions, type UseEmbedResult, useEmbedContext } from './hooks';

// Context
export { EmbedContext, type EmbedContextValue } from './context';
