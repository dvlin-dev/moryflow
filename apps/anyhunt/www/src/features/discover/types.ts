/**
 * Discover Feature Types
 *
 * [DEFINES]: Discover Feed 和 Topics 的类型定义
 * [USED_BY]: discover/api.ts, discover/hooks.ts, reader components
 */

// ========== Feed Item ==========

export interface DiscoverTopic {
  id: string;
  slug: string;
  title: string;
  subscriberCount: number;
}

export interface DiscoverFeedItem {
  id: string;
  title: string;
  url: string;
  aiSummary: string | null;
  siteName: string | null;
  favicon: string | null;
  scoreOverall: number;
  topic: DiscoverTopic;
  editionId: string;
  editionAt: string;
}

export interface DiscoverFeedResponse {
  items: DiscoverFeedItem[];
  generatedAt: string;
}

// ========== Topics ==========

export interface DiscoverTopicItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  subscriberCount: number;
  lastEditionAt: string | null;
}

export interface DiscoverTrendingTopicItem extends DiscoverTopicItem {
  trendingScore: number;
}

export interface DiscoverFeaturedTopicsResponse {
  items: DiscoverTopicItem[];
}

export interface DiscoverTrendingTopicsResponse {
  items: DiscoverTrendingTopicItem[];
}

// ========== Feed Type ==========

export type DiscoverFeedType = 'featured' | 'trending';
