/**
 * Vimeo oEmbed Provider
 */
import { PROVIDER_CACHE_TTL, PROVIDER_ENDPOINTS } from '../oembed.constants';
import type { ProviderName } from '../oembed.types';
import { BaseOembedProvider } from './base.provider';

export class VimeoProvider extends BaseOembedProvider {
  readonly name: ProviderName = 'vimeo';
  readonly endpoint = PROVIDER_ENDPOINTS.vimeo;
  readonly cacheTtlSeconds = PROVIDER_CACHE_TTL.vimeo;

  readonly patterns = [
    // 标准视频页
    /^https?:\/\/(www\.)?vimeo\.com\/\d+/i,
    // 频道视频
    /^https?:\/\/(www\.)?vimeo\.com\/channels\/[\w-]+\/\d+/i,
    // 群组视频
    /^https?:\/\/(www\.)?vimeo\.com\/groups\/[\w-]+\/videos\/\d+/i,
    // On Demand
    /^https?:\/\/(www\.)?vimeo\.com\/ondemand\/[\w-]+/i,
  ];
}
