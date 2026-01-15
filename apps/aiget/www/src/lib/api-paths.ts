/**
 * [DEFINES]: API path constants for www
 * [POS]: Centralized API endpoint definitions
 */

// Digest Console API (Session auth)
export const DIGEST_API = {
  SUBSCRIPTIONS: '/api/v1/console/digest/subscriptions',
  INBOX: '/api/v1/console/digest/inbox',
  TOPICS: '/api/v1/console/digest/topics',
} as const;

// Digest Public API (no auth)
export const DIGEST_PUBLIC_API = {
  TOPICS: '/api/v1/digest/topics',
} as const;

// Discover Public API (no auth)
export const DISCOVER_API = {
  FEED: '/api/v1/discover/feed',
  FEATURED_TOPICS: '/api/v1/discover/featured-topics',
  TRENDING_TOPICS: '/api/v1/discover/trending-topics',
} as const;

// User API
export const USER_API = {
  ME: '/api/v1/user/me',
} as const;
