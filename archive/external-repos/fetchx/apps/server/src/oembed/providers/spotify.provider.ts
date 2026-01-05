/**
 * Spotify oEmbed Provider
 */
import { PROVIDER_CACHE_TTL, PROVIDER_ENDPOINTS } from '../oembed.constants';
import type { ProviderName } from '../oembed.types';
import { BaseOembedProvider } from './base.provider';

export class SpotifyProvider extends BaseOembedProvider {
  readonly name: ProviderName = 'spotify';
  readonly endpoint = PROVIDER_ENDPOINTS.spotify;
  readonly cacheTtlSeconds = PROVIDER_CACHE_TTL.spotify;

  readonly patterns = [
    // 歌曲
    /^https?:\/\/open\.spotify\.com\/track\/[\w]+/i,
    // 专辑
    /^https?:\/\/open\.spotify\.com\/album\/[\w]+/i,
    // 播放列表
    /^https?:\/\/open\.spotify\.com\/playlist\/[\w]+/i,
    // 播客单集
    /^https?:\/\/open\.spotify\.com\/episode\/[\w]+/i,
    // 播客节目
    /^https?:\/\/open\.spotify\.com\/show\/[\w]+/i,
    // 艺术家
    /^https?:\/\/open\.spotify\.com\/artist\/[\w]+/i,
  ];
}
