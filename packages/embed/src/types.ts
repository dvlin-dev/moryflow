/**
 * [DEFINES]: Embed 请求/响应类型与客户端配置
 * [USED_BY]: @anyhunt/embed, @anyhunt/embed-react
 * [POS]: oEmbed 类型定义（与服务端 oembed.types.ts 对齐）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 packages/embed/CLAUDE.md
 */

/** oEmbed 响应类型 */
export type EmbedType = 'photo' | 'video' | 'link' | 'rich';

/** 支持的 Provider 名称 */
export type ProviderName = 'twitter' | 'youtube' | 'vimeo' | 'spotify' | 'soundcloud' | 'unknown';

/** 主题选项 */
export type EmbedTheme = 'light' | 'dark';

/** 客户端配置 */
export interface EmbedClientConfig {
  /** API Key */
  apiKey: string;
  /** API 基础 URL，默认为 https://server.anyhunt.app */
  baseUrl?: string;
  /** 请求超时时间（毫秒），默认 30000 */
  timeout?: number;
}

/** 请求选项 */
export interface EmbedOptions {
  maxWidth?: number;
  maxHeight?: number;
  theme?: EmbedTheme;
}

/** oEmbed 数据（标准 oEmbed 1.0 规范） */
export interface EmbedData {
  type: EmbedType;
  version: '1.0';

  // 通用可选字段
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name?: string;
  provider_url?: string;
  cache_age?: number;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;

  // photo 类型
  url?: string;

  // photo/video/rich 类型
  width?: number;
  height?: number;

  // video/rich 类型
  html?: string;
}

/** API 成功响应 */
export interface EmbedResponse {
  success: true;
  data: EmbedData;
  meta: {
    provider: string;
    cached: boolean;
  };
}

/** API 错误响应 */
export interface EmbedErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
