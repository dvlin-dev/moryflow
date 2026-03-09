/**
 * [PROVIDES]: createEmbedClient, EmbedClient, Embed* types, EmbedError, detectProvider
 * [DEPENDS]: ./client, ./types, ./errors, ./utils
 * [POS]: @moryflow/embed 包入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

// Client
export { createEmbedClient, type EmbedClient } from './client';

// Types
export type {
  EmbedType,
  ProviderName,
  EmbedTheme,
  EmbedClientConfig,
  EmbedOptions,
  EmbedData,
} from './types';

// Errors
export { EmbedError, NetworkError, ApiError } from './errors';

// Utils
export { detectProvider, isSupported } from './utils';
