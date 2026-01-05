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
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============== API Response Types ==============

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============== Helper ==============

function handleApiResponse<T>(response: Response, json: ApiResponse<T>): T {
  if (!response.ok || !json.success) {
    const errorJson = json as ApiErrorResponse;
    throw new ApiError(
      errorJson.error?.message || `Request failed (${response.status})`,
      errorJson.error?.code
    );
  }
  return json.data;
}

// ============== API Functions ==============

/**
 * Check if current IP is verified
 */
export async function checkVerifyStatus(apiUrl: string): Promise<{ verified: boolean }> {
  try {
    const response = await fetch(`${apiUrl}/api/v1/demo/verify-status`, {
      method: 'GET',
    });
    if (!response.ok) {
      return { verified: false };
    }
    const json = (await response.json()) as ApiResponse<{ verified: boolean }>;
    return json.success ? json.data : { verified: false };
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
  const body: Record<string, unknown> = { url };
  if (captcha) {
    body.captcha = captcha;
  }

  const response = await fetch(`${apiUrl}/api/v1/demo/screenshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  interface ScreenshotData {
    imageDataUrl: string;
    processingMs: number;
    fileSize?: number;
    width?: number;
    height?: number;
  }

  const json = (await response.json()) as ApiResponse<ScreenshotData>;
  const data = handleApiResponse(response, json);

  if (!data.imageDataUrl) {
    throw new ApiError('No screenshot data returned');
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
  const body: Record<string, unknown> = {
    url,
    formats: options?.formats || ['markdown'],
    onlyMainContent: options?.onlyMainContent ?? true,
  };
  if (captcha) {
    body.captcha = captcha;
  }

  const response = await fetch(`${apiUrl}/api/v1/demo/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = (await response.json()) as ApiResponse<ScrapeResult>;
  return handleApiResponse(response, json);
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
  const body: Record<string, unknown> = {
    url,
    search: options?.search,
    includeSubdomains: options?.includeSubdomains ?? false,
  };
  if (captcha) {
    body.captcha = captcha;
  }

  const response = await fetch(`${apiUrl}/api/v1/demo/map`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = (await response.json()) as ApiResponse<MapResult>;
  return handleApiResponse(response, json);
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
  const body: Record<string, unknown> = {
    url,
    maxDepth: options?.maxDepth ?? 1,
    limit: options?.limit ?? 3,
  };
  if (captcha) {
    body.captcha = captcha;
  }

  const response = await fetch(`${apiUrl}/api/v1/demo/crawl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = (await response.json()) as ApiResponse<CrawlResult>;
  return handleApiResponse(response, json);
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
  const body: Record<string, unknown> = {
    url,
    prompt: options.prompt,
    schema: options.schema,
  };
  if (captcha) {
    body.captcha = captcha;
  }

  const response = await fetch(`${apiUrl}/api/v1/demo/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = (await response.json()) as ApiResponse<ExtractResult>;
  return handleApiResponse(response, json);
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
  const body: Record<string, unknown> = {
    query,
    limit: options?.limit ?? 5,
  };
  if (captcha) {
    body.captcha = captcha;
  }

  const response = await fetch(`${apiUrl}/api/v1/demo/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = (await response.json()) as ApiResponse<SearchResult>;
  return handleApiResponse(response, json);
}
