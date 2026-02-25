import { tool } from '@openai/agents-core';
import { z } from 'zod';
import type { PlatformCapabilities } from '@moryflow/agents-adapter';
import { toolSummarySchema } from '../shared';

const webSearchParams = z.object({
  summary: toolSummarySchema.default('web_search'),
  query: z.string().min(1).describe('搜索关键词'),
  allowed_domains: z.array(z.string()).optional().describe('只搜索这些域名（可选）'),
  blocked_domains: z.array(z.string()).optional().describe('排除这些域名（可选）'),
});

/**
 * 搜索结果项
 */
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * 使用 DuckDuckGo HTML 搜索
 * 注意：这是一个简化实现，生产环境建议使用专业搜索 API
 */
const searchDuckDuckGo = async (
  query: string,
  fetchFn: typeof globalThis.fetch
): Promise<SearchResult[]> => {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  const response = await fetchFn(searchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`搜索请求失败: ${response.status}`);
  }

  const html = await response.text();
  const results: SearchResult[] = [];

  // 简单的正则提取搜索结果
  const resultPattern =
    /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/a>/gi;

  let match;
  while ((match = resultPattern.exec(html)) !== null && results.length < 10) {
    const [, url, title, snippetHtml] = match;
    // 清理 snippet 中的 HTML 标签
    const snippet = snippetHtml.replace(/<[^>]+>/g, '').trim();
    if (url && title) {
      // DuckDuckGo 的 URL 可能是重定向链接，尝试提取真实 URL
      const realUrl = url.includes('uddg=')
        ? decodeURIComponent(url.split('uddg=')[1].split('&')[0])
        : url;
      results.push({
        title: title.trim(),
        url: realUrl,
        snippet,
      });
    }
  }

  return results;
};

/**
 * 过滤搜索结果
 */
const filterResults = (
  results: SearchResult[],
  allowedDomains?: string[],
  blockedDomains?: string[]
): SearchResult[] => {
  return results.filter((result) => {
    try {
      const domain = new URL(result.url).hostname;

      if (allowedDomains && allowedDomains.length > 0) {
        return allowedDomains.some((d) => domain.includes(d));
      }

      if (blockedDomains && blockedDomains.length > 0) {
        return !blockedDomains.some((d) => domain.includes(d));
      }

      return true;
    } catch {
      return false;
    }
  });
};

/**
 * 创建网络搜索工具
 */
export const createWebSearchTool = (capabilities: PlatformCapabilities, _apiKey?: string) => {
  const { fetch: fetchFn } = capabilities;

  return tool({
    name: 'web_search',
    description:
      '搜索互联网获取最新信息。可用于查找资讯、技术文档、教程等。返回搜索结果的标题、链接和摘要。',
    parameters: webSearchParams,
    async execute({ query, allowed_domains, blocked_domains }) {
      console.log('[tool] web_search', { query, allowed_domains, blocked_domains });

      try {
        const rawResults = await searchDuckDuckGo(query, fetchFn);
        const results = filterResults(rawResults, allowed_domains, blocked_domains);

        if (results.length === 0) {
          return {
            success: true,
            query,
            results: [],
            message: '没有找到相关结果，请尝试换个关键词',
          };
        }

        return {
          success: true,
          query,
          results,
          message: `找到 ${results.length} 条相关结果`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          query,
          error: `搜索失败: ${message}`,
          results: [],
        };
      }
    },
  });
};
