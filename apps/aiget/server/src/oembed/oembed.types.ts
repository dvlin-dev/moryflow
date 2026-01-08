/**
 * oEmbed 类型定义
 * @see https://oembed.com/
 */

/** oEmbed 响应类型 */
export type OembedType = 'photo' | 'video' | 'link' | 'rich';

/** 支持的 Provider 名称 */
export type ProviderName =
  | 'twitter'
  | 'youtube'
  | 'vimeo'
  | 'spotify'
  | 'soundcloud';

/** 主题选项 */
export type OembedTheme = 'light' | 'dark';

/** oEmbed 请求选项 */
export interface OembedOptions {
  maxwidth?: number;
  maxheight?: number;
  theme?: OembedTheme;
}

/** oEmbed 响应数据（标准 oEmbed 1.0 规范） */
export interface OembedData {
  // 必填字段
  type: OembedType;
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

  // photo 类型必填
  url?: string;

  // photo/video/rich 类型必填
  width?: number;
  height?: number;

  // video/rich 类型必填
  html?: string;
}
