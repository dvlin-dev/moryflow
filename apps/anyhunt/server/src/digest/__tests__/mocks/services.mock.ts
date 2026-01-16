/**
 * Services Mock Factory
 *
 * [PROVIDES]: Digest 服务依赖的 Mock 工厂
 * [POS]: 为 Digest 服务测试提供外部服务的 Mock
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

// ========== Redis Service Mock ==========

export type MockRedisService = {
  get: Mock;
  set: Mock;
  del: Mock;
  setex: Mock;
  incr: Mock;
  expire: Mock;
  exists: Mock;
};

export function createMockRedisService(): MockRedisService {
  return {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    setex: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    exists: vi.fn(),
  };
}

// ========== Search Service Mock ==========

export type MockSearchService = {
  search: Mock;
};

export function createMockSearchService(): MockSearchService {
  return {
    search: vi.fn(),
  };
}

// ========== Scraper Service Mock ==========

export type MockScraperService = {
  scrape: Mock;
  batchScrape: Mock;
};

export function createMockScraperService(): MockScraperService {
  return {
    scrape: vi.fn(),
    batchScrape: vi.fn(),
  };
}

// ========== Map Service Mock ==========

export type MockMapService = {
  map: Mock;
};

export function createMockMapService(): MockMapService {
  return {
    map: vi.fn(),
  };
}

// ========== Email Service Mock ==========

export type MockEmailService = {
  send: Mock;
};

export function createMockEmailService(): MockEmailService {
  return {
    send: vi.fn(),
  };
}

// ========== LLM Client Mock ==========

export type MockLlmClient = {
  chat: Mock;
  generateText: Mock;
};

export function createMockLlmClient(): MockLlmClient {
  return {
    chat: vi.fn(),
    generateText: vi.fn(),
  };
}

// ========== URL Validator Mock ==========

export type MockUrlValidator = {
  validate: Mock;
  isAllowed: Mock;
};

export function createMockUrlValidator(): MockUrlValidator {
  return {
    validate: vi.fn().mockReturnValue({ valid: true }),
    isAllowed: vi.fn().mockReturnValue(true),
  };
}

// ========== Config Service Mock ==========

export type MockConfigService = {
  get: Mock;
  getOrThrow: Mock;
};

export function createMockConfigService(
  config: Record<string, unknown> = {},
): MockConfigService {
  return {
    get: vi.fn(
      (key: string, defaultValue?: unknown) => config[key] ?? defaultValue,
    ),
    getOrThrow: vi.fn((key: string) => {
      if (key in config) return config[key];
      throw new Error(`Config key not found: ${key}`);
    }),
  };
}

// ========== BullMQ Queue Mock ==========

export type MockQueue = {
  add: Mock;
  addBulk: Mock;
  getJob: Mock;
  getJobs: Mock;
  pause: Mock;
  resume: Mock;
  obliterate: Mock;
};

export function createMockQueue(): MockQueue {
  return {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    addBulk: vi.fn().mockResolvedValue([{ id: 'job-1' }]),
    getJob: vi.fn(),
    getJobs: vi.fn().mockResolvedValue([]),
    pause: vi.fn(),
    resume: vi.fn(),
    obliterate: vi.fn(),
  };
}

// ========== Logger Mock ==========

export type MockLogger = {
  log: Mock;
  error: Mock;
  warn: Mock;
  debug: Mock;
  verbose: Mock;
};

export function createMockLogger(): MockLogger {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
  };
}

// ========== Quota Service Mock ==========

export type MockQuotaService = {
  getStatus: Mock;
  checkAvailable: Mock;
  deduct: Mock;
  deductOrThrow: Mock;
  refund: Mock;
};

export function createMockQuotaService(): MockQuotaService {
  return {
    getStatus: vi.fn(),
    checkAvailable: vi.fn().mockResolvedValue(true),
    deduct: vi.fn().mockResolvedValue({ success: true, source: 'MONTHLY' }),
    deductOrThrow: vi
      .fn()
      .mockResolvedValue({ source: 'MONTHLY', transactionId: 'tx-1' }),
    refund: vi.fn().mockResolvedValue({ success: true }),
  };
}

// ========== Digest Service Mocks ==========

export type MockDigestRunService = {
  createRun: Mock;
  startRun: Mock;
  completeRun: Mock;
  failRun: Mock;
  createRunItem: Mock;
  createRunItems: Mock;
  deliverItems: Mock;
  findOne: Mock;
  findMany: Mock;
  findRunItems: Mock;
  calculateOverallScore: Mock;
};

export function createMockDigestRunService(): MockDigestRunService {
  return {
    createRun: vi.fn(),
    startRun: vi.fn(),
    completeRun: vi.fn(),
    failRun: vi.fn(),
    createRunItem: vi.fn(),
    createRunItems: vi.fn(),
    deliverItems: vi.fn(),
    findOne: vi.fn(),
    findMany: vi.fn(),
    findRunItems: vi.fn(),
    calculateOverallScore: vi.fn(),
  };
}

export type MockDigestContentService = {
  ingestContent: Mock;
  cacheFulltext: Mock;
  getFulltext: Mock;
  createEnrichment: Mock;
  getEnrichment: Mock;
  findByIds: Mock;
  findByUrlHash: Mock;
  findByUrlHashes: Mock;
  findWithEnrichment: Mock;
};

export function createMockDigestContentService(): MockDigestContentService {
  return {
    ingestContent: vi.fn(),
    cacheFulltext: vi.fn(),
    getFulltext: vi.fn(),
    createEnrichment: vi.fn(),
    getEnrichment: vi.fn(),
    findByIds: vi.fn(),
    findByUrlHash: vi.fn(),
    findByUrlHashes: vi.fn(),
    findWithEnrichment: vi.fn(),
  };
}

export type MockDigestAiService = {
  generateSummary: Mock;
  generateNarrative: Mock;
  generateReason: Mock;
  generateSummaryBatch: Mock;
};

export function createMockDigestAiService(): MockDigestAiService {
  return {
    generateSummary: vi.fn(),
    generateNarrative: vi.fn(),
    generateReason: vi.fn(),
    generateSummaryBatch: vi.fn(),
  };
}

export type MockDigestSourceService = {
  fetchSourceContents: Mock;
  mergeContents: Mock;
};

export function createMockDigestSourceService(): MockDigestSourceService {
  return {
    fetchSourceContents: vi.fn().mockResolvedValue([]),
    mergeContents: vi.fn((a, b) => [...a, ...b]),
  };
}

export type MockDigestFeedbackService = {
  recordFeedback: Mock;
  getPatterns: Mock;
};

export function createMockDigestFeedbackService(): MockDigestFeedbackService {
  return {
    recordFeedback: vi.fn(),
    getPatterns: vi.fn().mockResolvedValue([]),
  };
}

export type MockDigestNotificationService = {
  onRunCompleted: Mock;
};

export function createMockDigestNotificationService(): MockDigestNotificationService {
  return {
    onRunCompleted: vi.fn(),
  };
}

export type MockDigestRateLimitService = {
  checkTopicOperation: Mock;
  checkPublicTopicCount: Mock;
  recordTopicOperation: Mock;
  getRemainingOperations: Mock;
};

export function createMockDigestRateLimitService(): MockDigestRateLimitService {
  return {
    checkTopicOperation: vi.fn(),
    checkPublicTopicCount: vi.fn(),
    recordTopicOperation: vi.fn(),
    getRemainingOperations: vi
      .fn()
      .mockResolvedValue({ remaining: 3, limit: 3, isUnlimited: false }),
  };
}

// ========== Digest RSS Service Mock ==========

export type MockDigestRssService = {
  fetchAndParse: Mock;
};

export function createMockDigestRssService(): MockDigestRssService {
  return {
    fetchAndParse: vi.fn().mockResolvedValue({ meta: {}, items: [] }),
  };
}

// ========== Digest Site Crawl Service Mock ==========

export type MockDigestSiteCrawlService = {
  crawlSite: Mock;
};

export function createMockDigestSiteCrawlService(): MockDigestSiteCrawlService {
  return {
    crawlSite: vi
      .fn()
      .mockResolvedValue({
        pages: [],
        discoveredUrls: [],
        crawledCount: 0,
        errorCount: 0,
      }),
  };
}

// ========== Scraper Service Mock (with scrapeSync) ==========

export type MockScraperServiceFull = {
  scrape: Mock;
  scrapeSync: Mock;
  batchScrape: Mock;
};

export function createMockScraperServiceFull(): MockScraperServiceFull {
  return {
    scrape: vi.fn(),
    scrapeSync: vi.fn(),
    batchScrape: vi.fn(),
  };
}
