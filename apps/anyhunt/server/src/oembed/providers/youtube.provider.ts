/**
 * YouTube oEmbed Provider
 */
import { PROVIDER_CACHE_TTL, PROVIDER_ENDPOINTS } from '../oembed.constants';
import type { ProviderName } from '../oembed.types';
import { BaseOembedProvider } from './base.provider';

export class YouTubeProvider extends BaseOembedProvider {
  readonly name: ProviderName = 'youtube';
  readonly endpoint = PROVIDER_ENDPOINTS.youtube;
  readonly cacheTtlSeconds = PROVIDER_CACHE_TTL.youtube;

  readonly patterns = [
    // 标准观看页
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/i,
    // 短链接
    /^https?:\/\/youtu\.be\/[\w-]+/i,
    // 嵌入链接
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/i,
    // Shorts
    /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/i,
    // 直播
    /^https?:\/\/(www\.)?youtube\.com\/live\/[\w-]+/i,
  ];
}
