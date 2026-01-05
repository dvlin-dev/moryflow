/**
 * [INPUT]: SearchOptions - Query, filters, scrape config
 * [OUTPUT]: SearchResponse - Results with titles, URLs, descriptions, optional content
 * [POS]: Core search logic - SearXNG integration, retry handling, result enrichment
 *
 * [PROTOCOL]: When this file changes, update this header and src/search/CLAUDE.md
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScraperService } from '../scraper/scraper.service';
import type { SearchOptions } from './dto/search.dto';
import type {
  SearchResult,
  SearchResponse,
  SearXNGResponse,
} from './search.types';

/** 默认重试次数 */
const DEFAULT_RETRY_COUNT = 3;

/** 默认重试延迟 (ms) */
const DEFAULT_RETRY_DELAY = 1000;

/** 默认并发数 */
const DEFAULT_CONCURRENCY = 5;

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly searxngUrl: string;
  private readonly retryCount: number;
  private readonly retryDelay: number;
  private readonly concurrency: number;

  constructor(
    private config: ConfigService,
    private scraperService: ScraperService,
  ) {
    this.searxngUrl = config.get('SEARXNG_URL') || 'http://localhost:8080';
    this.retryCount = config.get('SEARCH_RETRY_COUNT') || DEFAULT_RETRY_COUNT;
    this.retryDelay = config.get('SEARCH_RETRY_DELAY') || DEFAULT_RETRY_DELAY;
    this.concurrency = config.get('SEARCH_CONCURRENCY') || DEFAULT_CONCURRENCY;
  }

  /**
   * 执行搜索
   */
  async search(
    userId: string,
    options: SearchOptions,
  ): Promise<SearchResponse> {
    const {
      query,
      limit = 10,
      categories,
      engines,
      language,
      timeRange,
      safeSearch,
      scrapeResults,
      scrapeOptions,
    } = options;

    // 1. 调用 SearXNG API
    const searchResults = await this.performSearch({
      query,
      limit,
      categories,
      engines,
      language,
      timeRange,
      safeSearch,
    });

    // 2. 如果需要抓取结果页面
    if (scrapeResults && searchResults.results.length > 0) {
      const enrichedResults = await this.enrichWithContent(
        userId,
        searchResults.results,
        scrapeOptions,
      );
      return {
        query: searchResults.query,
        numberOfResults: searchResults.numberOfResults,
        results: enrichedResults,
        suggestions: searchResults.suggestions,
      };
    }

    return searchResults;
  }

  /**
   * 调用 SearXNG API（带重试）
   */
  private async performSearch(options: {
    query: string;
    limit: number;
    categories?: string[];
    engines?: string[];
    language?: string;
    timeRange?: string;
    safeSearch?: number;
  }): Promise<SearchResponse> {
    const {
      query,
      limit,
      categories,
      engines,
      language,
      timeRange,
      safeSearch,
    } = options;

    // 构造 SearXNG API 请求参数
    const params = new URLSearchParams({
      q: query,
      format: 'json',
    });

    // 搜索类别 (多个用逗号分隔)
    if (categories?.length) {
      params.set('categories', categories.join(','));
    }

    // 指定搜索引擎
    if (engines?.length) {
      params.set('engines', engines.join(','));
    }

    // 语言
    if (language) {
      params.set('language', language);
    }

    // 时间范围
    if (timeRange) {
      params.set('time_range', timeRange);
    }

    // 安全搜索
    if (safeSearch !== undefined) {
      params.set('safesearch', String(safeSearch));
    }

    // 带重试的请求
    return this.fetchWithRetry(
      `${this.searxngUrl}/search?${params}`,
      async (response) => {
        const data: SearXNGResponse = await response.json();

        // 转换并限制结果数量
        const results: SearchResult[] = data.results
          .slice(0, limit)
          .map((result) => ({
            title: result.title,
            url: result.url,
            description: result.content || '',
            engine: result.engine,
            score: result.score,
            publishedDate: result.publishedDate,
            thumbnail: result.thumbnail || result.img_src,
          }));

        return {
          query: data.query,
          numberOfResults: data.number_of_results,
          results,
          suggestions: data.suggestions,
        };
      },
    );
  }

  /**
   * 带重试的 fetch
   */
  private async fetchWithRetry<T>(
    url: string,
    parser: (response: Response) => Promise<T>,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(
            `SearXNG API error: ${response.status} ${response.statusText}`,
          );
        }

        return await parser(response);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `SearXNG request failed (attempt ${attempt}/${this.retryCount}): ${lastError.message}`,
        );

        if (attempt < this.retryCount) {
          // 指数退避
          await this.sleep(this.retryDelay * Math.pow(2, attempt - 1));
        }
      }
    }

    this.logger.error(
      `SearXNG search failed after ${this.retryCount} attempts`,
    );
    throw lastError;
  }

  /**
   * 延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 并发抓取搜索结果页面内容
   */
  private async enrichWithContent(
    userId: string,
    results: SearchResult[],
    scrapeOptions?: Record<string, unknown>,
  ): Promise<SearchResult[]> {
    const enrichedResults: SearchResult[] = [];

    for (let i = 0; i < results.length; i += this.concurrency) {
      const batch = results.slice(i, i + this.concurrency);
      const batchResults = await Promise.all(
        batch.map(async (result) => {
          try {
            const scraped = await this.scraperService.scrapeSync(userId, {
              url: result.url,
              formats: ['markdown'],
              onlyMainContent: true,
              timeout: 15000,
              mobile: false,
              darkMode: false,
              ...(scrapeOptions as Record<string, unknown>),
            });
            return {
              ...result,
              content: scraped.markdown,
            };
          } catch (error) {
            this.logger.warn(`Failed to scrape ${result.url}: ${error}`);
            return result;
          }
        }),
      );
      enrichedResults.push(...batchResults);
    }

    return enrichedResults;
  }

  /**
   * 获取搜索建议 (自动补全)
   */
  async getAutocomplete(query: string): Promise<string[]> {
    const params = new URLSearchParams({
      q: query,
    });

    try {
      const response = await fetch(
        `${this.searxngUrl}/autocompleter?${params}`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return (data[1] as string[]) || []; // SearXNG 返回 [query, suggestions]
    } catch {
      return [];
    }
  }
}
