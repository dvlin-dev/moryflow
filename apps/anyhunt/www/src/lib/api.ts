import type { ProblemDetails } from '@moryflow/types';
import { getPublicApiClient } from './public-api-client';

// ============== Types ==============

export interface CaptureResult {
  imageUrl: string;
  captureTime: number;
  imageSize: number;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface ScrapeResult {
  markdown?: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  screenshot?: {
    url?: string;
    base64?: string;
    width?: number;
    height?: number;
  };
  pdf?: {
    url: string;
    pageCount: number;
    fileSize: number;
    expiresAt?: string;
  };
  metadata?: {
    title?: string;
    description?: string;
    ogImage?: string;
    favicon?: string;
  };
  processingMs: number;
  fromCache?: boolean;
}

export interface MapResult {
  links: string[];
  count: number;
  processingMs: number;
}

export interface CrawlPage {
  url: string;
  depth: number;
  markdown?: string;
  metadata?: {
    title?: string;
    description?: string;
  };
}

export interface CrawlResult {
  pages: CrawlPage[];
  totalUrls: number;
  completedUrls: number;
  processingMs: number;
}

export interface ExtractResult {
  data: unknown;
  processingMs: number;
}

export interface SearchResultItem {
  title: string;
  url: string;
  description?: string;
}

export interface SearchResult {
  results: SearchResultItem[];
  query: string;
  processingMs: number;
}

// ============== Error ==============

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  requestId?: string;
  errors?: Array<{ field?: string; message: string }>;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
    requestId?: string,
    errors?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.errors = errors;
  }
}

// ============== Helper ==============

async function throwApiError(response: Response): Promise<never> {
  const contentType = response.headers.get('content-type') ?? '';
  const isJson =
    contentType.includes('application/json') || contentType.includes('application/problem+json');
  const payload = isJson ? await response.json().catch(() => ({})) : {};
  const problem = payload as ProblemDetails;
  const message =
    typeof problem?.detail === 'string' ? problem.detail : `Request failed (${response.status})`;
  const code = typeof problem?.code === 'string' ? problem.code : undefined;
  const requestId = problem?.requestId ?? response.headers.get('x-request-id') ?? undefined;
  throw new ApiError(message, response.status, code, problem?.details, requestId, problem?.errors);
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    await throwApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson =
    contentType.includes('application/json') || contentType.includes('application/problem+json');
  const requestId = response.headers.get('x-request-id') ?? undefined;

  if (!isJson) {
    throw new ApiError(
      'Unexpected response format',
      response.status,
      'UNEXPECTED_RESPONSE',
      undefined,
      requestId
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(
      'Invalid JSON response',
      response.status,
      'UNEXPECTED_RESPONSE',
      undefined,
      requestId
    );
  }
}

// ============== API Functions ==============

/**
 * Check if current IP is verified
 */
export async function checkVerifyStatus(apiUrl: string): Promise<{ verified: boolean }> {
  const client = getPublicApiClient(apiUrl);
  try {
    return await client.get<{ verified: boolean }>('/api/v1/public/demo/verify-status', {
      authMode: 'public',
    });
  } catch {
    return { verified: false };
  }
}

/**
 * Screenshot
 */
export async function captureScreenshot(
  url: string,
  captcha: string | null,
  apiUrl: string
): Promise<CaptureResult> {
  const client = getPublicApiClient(apiUrl);
  const body: Record<string, unknown> = { url };
  if (captcha) {
    body.captcha = captcha;
  }

  interface ScreenshotData {
    imageDataUrl: string;
    processingMs: number;
    fileSize?: number;
    width?: number;
    height?: number;
  }

  const data = await client.post<ScreenshotData>('/api/v1/public/demo/screenshot', {
    body,
    authMode: 'public',
  });

  if (!data.imageDataUrl) {
    throw new ApiError('No screenshot data returned', 500);
  }

  return {
    imageUrl: data.imageDataUrl,
    captureTime: data.processingMs || 0,
    imageSize: data.fileSize || 0,
    dimensions: {
      width: data.width || 0,
      height: data.height || 0,
    },
  };
}

/**
 * Scrape URL
 */
export async function scrapeUrl(
  url: string,
  captcha: string | null,
  apiUrl: string,
  options?: {
    formats?: string[];
    onlyMainContent?: boolean;
  }
): Promise<ScrapeResult> {
  const client = getPublicApiClient(apiUrl);
  const body: Record<string, unknown> = {
    url,
    formats: options?.formats || ['markdown'],
    onlyMainContent: options?.onlyMainContent ?? true,
  };
  if (captcha) {
    body.captcha = captcha;
  }

  return client.post<ScrapeResult>('/api/v1/public/demo/scrape', {
    body,
    authMode: 'public',
  });
}

/**
 * Map Site URLs
 */
export async function mapSite(
  url: string,
  captcha: string | null,
  apiUrl: string,
  options?: {
    search?: string;
    includeSubdomains?: boolean;
  }
): Promise<MapResult> {
  const client = getPublicApiClient(apiUrl);
  const body: Record<string, unknown> = {
    url,
    search: options?.search,
    includeSubdomains: options?.includeSubdomains ?? false,
  };
  if (captcha) {
    body.captcha = captcha;
  }

  return client.post<MapResult>('/api/v1/public/demo/map', {
    body,
    authMode: 'public',
  });
}

/**
 * Crawl Site
 */
export async function crawlSite(
  url: string,
  captcha: string | null,
  apiUrl: string,
  options?: {
    maxDepth?: number;
    limit?: number;
  }
): Promise<CrawlResult> {
  const client = getPublicApiClient(apiUrl);
  const body: Record<string, unknown> = {
    url,
    maxDepth: options?.maxDepth ?? 1,
    limit: options?.limit ?? 3,
  };
  if (captcha) {
    body.captcha = captcha;
  }

  return client.post<CrawlResult>('/api/v1/public/demo/crawl', {
    body,
    authMode: 'public',
  });
}

/**
 * Extract Data with AI
 */
export async function extractData(
  url: string,
  captcha: string | null,
  apiUrl: string,
  options: {
    prompt: string;
    schema?: Record<string, unknown>;
  }
): Promise<ExtractResult> {
  const client = getPublicApiClient(apiUrl);
  const body: Record<string, unknown> = {
    url,
    prompt: options.prompt,
    schema: options.schema,
  };
  if (captcha) {
    body.captcha = captcha;
  }

  return client.post<ExtractResult>('/api/v1/public/demo/extract', {
    body,
    authMode: 'public',
  });
}

/**
 * Search Web
 */
export async function searchWeb(
  query: string,
  captcha: string | null,
  apiUrl: string,
  options?: {
    limit?: number;
  }
): Promise<SearchResult> {
  const client = getPublicApiClient(apiUrl);
  const body: Record<string, unknown> = {
    query,
    limit: options?.limit ?? 5,
  };
  if (captcha) {
    body.captcha = captcha;
  }

  return client.post<SearchResult>('/api/v1/public/demo/search', {
    body,
    authMode: 'public',
  });
}
