/**
 * [PROVIDES]: EmbedProvider/Embed/useEmbed 等 React API
 * [DEPENDS]: @moryflow/embed, ./components, ./hooks, ./context
 * [POS]: @moryflow/embed-react 包入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
