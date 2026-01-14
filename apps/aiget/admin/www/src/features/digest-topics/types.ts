/**
 * Digest Topics Types
 *
 * [DEFINES]: Topic types for admin management
 * [POS]: Type definitions for topic featured management
 */

export type TopicVisibility = 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
export type TopicStatus = 'ACTIVE' | 'PAUSED_INSUFFICIENT_CREDITS' | 'PAUSED_BY_ADMIN';

export interface TopicUser {
  id: string;
  email: string;
  name: string | null;
}

export interface Topic {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: TopicVisibility;
  status: TopicStatus;
  featured: boolean;
  featuredOrder: number | null;
  featuredAt: string | null;
  subscriberCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: TopicUser | null;
  featuredBy: TopicUser | null;
  _count: {
    editions: number;
    followers: number;
  };
}

export interface TopicQuery {
  page?: number;
  limit?: number;
  search?: string;
  featured?: boolean;
  visibility?: TopicVisibility;
  status?: TopicStatus;
}

export interface TopicListResponse {
  items: Topic[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SetFeaturedInput {
  featured: boolean;
  featuredOrder?: number;
}

export interface ReorderFeaturedInput {
  topicIds: string[];
}
