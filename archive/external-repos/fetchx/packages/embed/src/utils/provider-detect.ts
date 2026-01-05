/**
 * URL Provider 识别
 */
import type { ProviderName } from '../types.ts';

const PROVIDER_PATTERNS: Record<Exclude<ProviderName, 'unknown'>, RegExp[]> = {
  twitter: [
    /^https?:\/\/(www\.)?(twitter|x)\.com\/\w+\/status\/\d+/i,
    /^https?:\/\/(www\.)?(twitter|x)\.com\/\w+\/timelines\/\d+/i,
  ],
  youtube: [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/i,
    /^https?:\/\/youtu\.be\/[\w-]+/i,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/i,
    /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/i,
  ],
  vimeo: [
    /^https?:\/\/(www\.)?vimeo\.com\/\d+/i,
    /^https?:\/\/(www\.)?vimeo\.com\/channels\/[\w-]+\/\d+/i,
  ],
  spotify: [
    /^https?:\/\/open\.spotify\.com\/(track|album|playlist|episode|show)\/[\w]+/i,
  ],
  soundcloud: [/^https?:\/\/(www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/i],
};

/**
 * 检测 URL 对应的 Provider
 */
export function detectProvider(url: string): ProviderName {
  for (const [provider, patterns] of Object.entries(PROVIDER_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(url))) {
      return provider as ProviderName;
    }
  }
  return 'unknown';
}

/**
 * 检查 URL 是否被支持
 */
export function isSupported(url: string): boolean {
  return detectProvider(url) !== 'unknown';
}
