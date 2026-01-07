/**
 * SoundCloud oEmbed Provider
 */
import { PROVIDER_CACHE_TTL, PROVIDER_ENDPOINTS } from '../oembed.constants';
import type { ProviderName } from '../oembed.types';
import { BaseOembedProvider } from './base.provider';

export class SoundCloudProvider extends BaseOembedProvider {
  readonly name: ProviderName = 'soundcloud';
  readonly endpoint = PROVIDER_ENDPOINTS.soundcloud;
  readonly cacheTtlSeconds = PROVIDER_CACHE_TTL.soundcloud;

  readonly patterns = [
    // 音轨
    /^https?:\/\/(www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/i,
    // 播放列表
    /^https?:\/\/(www\.)?soundcloud\.com\/[\w-]+\/sets\/[\w-]+/i,
  ];
}
