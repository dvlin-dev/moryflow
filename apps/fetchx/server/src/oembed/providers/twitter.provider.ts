/**
 * Twitter/X oEmbed Provider
 */
import { PROVIDER_CACHE_TTL, PROVIDER_ENDPOINTS } from '../oembed.constants';
import type { OembedOptions, ProviderName } from '../oembed.types';
import { BaseOembedProvider } from './base.provider';

export class TwitterProvider extends BaseOembedProvider {
  readonly name: ProviderName = 'twitter';
  readonly endpoint = PROVIDER_ENDPOINTS.twitter;
  readonly cacheTtlSeconds = PROVIDER_CACHE_TTL.twitter;

  readonly patterns = [
    // 推文
    /^https?:\/\/(www\.)?(twitter|x)\.com\/\w+\/status\/\d+/i,
    // 时间线
    /^https?:\/\/(www\.)?(twitter|x)\.com\/\w+\/timelines\/\d+/i,
  ];

  protected appendExtraParams(
    params: URLSearchParams,
    options?: OembedOptions,
  ): void {
    // Twitter 支持 theme 参数
    if (options?.theme) {
      params.set('theme', options.theme);
    }
    // 隐藏推文中的媒体
    params.set('hide_media', 'false');
    // 隐藏推文串
    params.set('hide_thread', 'false');
    // 使用 lang
    params.set('lang', 'en');
  }
}
