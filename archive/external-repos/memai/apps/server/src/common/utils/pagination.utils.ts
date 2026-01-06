/**
 * Pagination Utilities
 * Helper functions for parsing and validating pagination parameters
 */

/** Default and max limits for pagination */
export const PAGINATION_DEFAULTS = {
  LIMIT: 20,
  MAX_LIMIT: 100,
  OFFSET: 0,
} as const;

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * Parse and validate pagination parameters from query strings
 * - Returns validated integers within allowed ranges
 * - Falls back to defaults for invalid values
 */
export function parsePaginationParams(
  limit?: string,
  offset?: string,
  maxLimit: number = PAGINATION_DEFAULTS.MAX_LIMIT,
): PaginationParams {
  let parsedLimit = limit ? parseInt(limit, 10) : PAGINATION_DEFAULTS.LIMIT;
  let parsedOffset = offset ? parseInt(offset, 10) : PAGINATION_DEFAULTS.OFFSET;

  // Handle NaN and invalid values
  if (isNaN(parsedLimit) || parsedLimit < 1) {
    parsedLimit = PAGINATION_DEFAULTS.LIMIT;
  }
  if (isNaN(parsedOffset) || parsedOffset < 0) {
    parsedOffset = PAGINATION_DEFAULTS.OFFSET;
  }

  // Enforce max limit
  parsedLimit = Math.min(parsedLimit, maxLimit);

  return {
    limit: parsedLimit,
    offset: parsedOffset,
  };
}

/**
 * Parse a positive integer from string, with fallback
 */
export function parsePositiveInt(
  value: string | undefined,
  defaultValue: number,
  maxValue?: number,
): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1) {
    return defaultValue;
  }

  if (maxValue !== undefined) {
    return Math.min(parsed, maxValue);
  }

  return parsed;
}

/**
 * Create a paginated result
 * The response interceptor will transform this to { success, data, meta, timestamp }
 */
export function createPaginatedResult<T>(
  items: T[],
  total: number,
  params: PaginationParams,
): PaginationResult<T> {
  return {
    items,
    pagination: {
      total,
      limit: params.limit,
      offset: params.offset,
    },
  };
}
