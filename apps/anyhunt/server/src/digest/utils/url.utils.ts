/**
 * URL Utilities
 *
 * [PROVIDES]: URL 规范化和哈希计算
 * [POS]: 内容去重的核心工具函数
 */

import { createHash } from 'crypto';

/**
 * 需要移除的追踪参数
 * 按字母顺序排列，便于维护
 */
const TRACKING_PARAMS = new Set([
  // UTM 参数
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  // Facebook
  'fbclid',
  // Google
  'gclid',
  'gclsrc',
  'dclid',
  // Microsoft/Bing
  'msclkid',
  // Twitter
  'twclid',
  // TikTok
  'ttclid',
  // Pinterest
  'epik',
  // Mailchimp
  'mc_cid',
  'mc_eid',
  // HubSpot
  '_hsenc',
  '_hsmi',
  '__hstc',
  '__hsfp',
  // Marketo
  'mkt_tok',
  // Adobe
  's_kwcid',
  'cid',
  // 通用追踪
  'ref',
  'source',
  'src',
  'via',
  'trk',
  'tracking',
  '_ga',
  '_gl',
]);

/**
 * 需要规范化的域名映射
 * 左边是常见变体，右边是规范形式
 */
const DOMAIN_NORMALIZATIONS: Record<string, string> = {
  'www.youtube.com': 'youtube.com',
  'm.youtube.com': 'youtube.com',
  'youtu.be': 'youtube.com',
  'www.twitter.com': 'twitter.com',
  'mobile.twitter.com': 'twitter.com',
  'x.com': 'twitter.com',
  'www.x.com': 'twitter.com',
  'www.github.com': 'github.com',
  'www.reddit.com': 'reddit.com',
  'old.reddit.com': 'reddit.com',
  'new.reddit.com': 'reddit.com',
  'm.reddit.com': 'reddit.com',
  'www.medium.com': 'medium.com',
  'www.linkedin.com': 'linkedin.com',
  'www.facebook.com': 'facebook.com',
  'm.facebook.com': 'facebook.com',
  'www.instagram.com': 'instagram.com',
  'm.instagram.com': 'instagram.com',
};

/**
 * 规范化 URL
 * 用于内容去重，确保相同内容的不同 URL 变体映射到同一个 canonical URL
 */
export function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // 1. 强制 HTTPS
    parsed.protocol = 'https:';

    // 2. 规范化域名
    let hostname = parsed.hostname.toLowerCase();
    if (DOMAIN_NORMALIZATIONS[hostname]) {
      hostname = DOMAIN_NORMALIZATIONS[hostname];
    } else if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    parsed.hostname = hostname;

    // 3. 移除追踪参数
    const params = new URLSearchParams(parsed.search);
    for (const key of [...params.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        params.delete(key);
      }
    }
    parsed.search = params.toString();

    // 4. 移除 fragment（锚点）
    parsed.hash = '';

    // 5. 规范化路径
    // - 移除尾部斜杠（除非是根路径）
    // - 移除重复斜杠
    let pathname = parsed.pathname.replace(/\/+/g, '/').replace(/\/+$/, '');

    if (pathname === '') {
      pathname = '/';
    }
    parsed.pathname = pathname;

    // 6. 特殊处理 YouTube
    if (hostname === 'youtube.com') {
      // youtu.be/xxx -> youtube.com/watch?v=xxx
      const videoId = params.get('v') || extractYouTubeId(url);
      if (videoId) {
        parsed.pathname = '/watch';
        parsed.search = `v=${videoId}`;
      }
    }

    return parsed.toString();
  } catch {
    // 如果 URL 解析失败，返回原始 URL
    return url;
  }
}

/**
 * 从各种 YouTube URL 格式中提取视频 ID
 */
function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // youtu.be/xxx
    if (hostname === 'youtu.be' || hostname === 'www.youtu.be') {
      return parsed.pathname.slice(1);
    }

    // youtube.com/watch?v=xxx
    if (hostname.includes('youtube.com')) {
      const v = new URLSearchParams(parsed.search).get('v');
      if (v) return v;

      // youtube.com/embed/xxx
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.slice('/embed/'.length);
      }

      // youtube.com/v/xxx
      if (parsed.pathname.startsWith('/v/')) {
        return parsed.pathname.slice(3);
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 计算 URL 的 SHA256 哈希
 * 用于数据库索引和快速查找
 */
export function computeUrlHash(canonicalUrl: string): string {
  return createHash('sha256').update(canonicalUrl).digest('hex');
}

/**
 * 从 URL 中提取域名（不含 www）
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    return hostname;
  } catch {
    return '';
  }
}

/**
 * 判断两个 URL 是否指向同一内容
 */
export function isSameContent(url1: string, url2: string): boolean {
  const canonical1 = canonicalizeUrl(url1);
  const canonical2 = canonicalizeUrl(url2);
  return canonical1 === canonical2;
}

/**
 * 批量计算 URL 哈希
 */
export function computeUrlHashes(urls: string[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const url of urls) {
    const canonical = canonicalizeUrl(url);
    const hash = computeUrlHash(canonical);
    result.set(url, hash);
  }
  return result;
}
