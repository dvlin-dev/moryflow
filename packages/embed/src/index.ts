/**
 * /embed - oEmbed API 客户端
 */

// Client
export { createEmbedClient, type EmbedClient } from './client.ts';

// Types
export type {
  EmbedType,
  ProviderName,
  EmbedTheme,
  EmbedClientConfig,
  EmbedOptions,
  EmbedData,
} from './types.ts';

// Errors
export { EmbedError, NetworkError, ApiError } from './errors.ts';

// Utils
export { detectProvider, isSupported } from './utils/index.ts';
