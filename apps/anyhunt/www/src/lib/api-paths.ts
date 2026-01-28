/**
 * [DEFINES]: API path constants for www
 * [POS]: Centralized API endpoint definitions
 */

// Digest App API (access token auth)
export const DIGEST_API = {
  SUBSCRIPTIONS: '/api/v1/app/digest/subscriptions',
  INBOX: '/api/v1/app/digest/inbox',
  TOPICS: '/api/v1/app/digest/topics',
} as const;

// Digest Public API (no auth)
export const DIGEST_PUBLIC_API = {
  TOPICS: '/api/v1/public/digest/topics',
} as const;

// User API
export const USER_API = {
  ME: '/api/v1/app/user/me',
} as const;
