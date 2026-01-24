/**
 * [PROVIDES]: createEmbedClient, EmbedClient, Embed* types, EmbedError, detectProvider
 * [DEPENDS]: ./client, ./types, ./errors, ./utils
 * [POS]: @anyhunt/embed 包入口
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 packages/embed/CLAUDE.md
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
