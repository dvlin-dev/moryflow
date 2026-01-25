/**
 * [DEFINES]: Agent/Browser Playground 类型
 * [USED_BY]: api.ts, transport/*, components/*
 * [POS]: Console Agent Browser Playground 类型定义
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type BrowserSessionInfo = {
  id: string;
  createdAt: string;
  expiresAt: string;
  url: string | null;
  title: string | null;
  isCdpConnection?: boolean;
  wsEndpoint?: string;
};

export type BrowserOpenResponse = {
  success: boolean;
  url: string;
  title: string | null;
  error?: string;
};

export type BrowserSnapshotResponse = {
  tree: string;
  refs: Record<string, unknown>;
  stats: {
    lines: number;
    chars: number;
    refs: number;
    interactive: number;
  };
};

export type BrowserDeltaSnapshotResponse = BrowserSnapshotResponse & {
  isDelta: boolean;
  addedRefs?: Record<string, unknown>;
  removedRefs?: string[];
  changedRefs?: Record<string, unknown>;
  baseHash?: string;
  currentHash: string;
};

export type BrowserActionResponse = {
  success: boolean;
  result?: unknown;
  error?: string;
  suggestion?: string;
};

export type BrowserActionBatchResponse = {
  success: boolean;
  results: BrowserActionResponse[];
};

export type BrowserScreenshotResponse = {
  data: string;
  mimeType: string;
  width: number;
  height: number;
};

export type BrowserTabInfo = {
  index: number;
  url: string;
  title: string;
  active: boolean;
};

export type BrowserWindowInfo = {
  index: number;
  url: string;
  title: string;
  active: boolean;
  tabCount: number;
};

export type BrowserHeadersResult = {
  scope: 'global' | 'origin';
  origin?: string;
};

export type BrowserConsoleMessage = {
  type: string;
  text: string;
  timestamp: number;
};

export type BrowserPageError = {
  message: string;
  timestamp: number;
};

export type BrowserTraceStartResult = {
  started: boolean;
};

export type BrowserTraceStopResult = {
  data?: string;
};

export type BrowserHarStartResult = {
  started: boolean;
};

export type BrowserHarStopResult = {
  requestCount: number;
  requests?: BrowserNetworkRequestRecord[];
};

export type BrowserNetworkRequestRecord = {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  status?: number;
  responseHeaders?: Record<string, string>;
  intercepted: boolean;
  timestamp: number;
};

export type BrowserStorageExportResult = {
  cookies: unknown[];
  localStorage: Record<string, Record<string, string>>;
  sessionStorage?: Record<string, Record<string, string>>;
  exportedAt: string;
};

export type BrowserProfileSaveResult = {
  profileId: string;
  storedAt: string;
  size: number;
};

export type BrowserProfileLoadResult = {
  imported: {
    cookies: number;
    localStorage: number;
    sessionStorage: number;
  };
};

export type BrowserStreamTokenResult = {
  token: string;
  wsUrl: string;
  expiresAt: number;
};

export type BrowserStreamStatus = {
  connected: boolean;
  screencasting: boolean;
};

export type BrowserStreamFrame = {
  data: string;
  metadata?: Record<string, unknown>;
};

export type AgentTaskProgress = {
  creditsUsed: number;
  toolCallCount: number;
  elapsedMs: number;
};

export type AgentTaskResult = {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  data?: unknown;
  creditsUsed?: number;
  error?: string;
  progress?: AgentTaskProgress;
};

export type AgentEstimateResponse = {
  estimatedCredits: number;
  breakdown: {
    base: number;
    tokenEstimate: number;
    toolCallEstimate: number;
    durationEstimate: number;
  };
};

export type JsonSchemaProperty = {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: Array<string | number | boolean>;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
};

export type AgentOutput =
  | { type: 'text' }
  | {
      type: 'json_schema';
      name?: string;
      strict?: boolean;
      schema: {
        type: 'object';
        properties: Record<string, JsonSchemaProperty>;
        required?: string[];
        additionalProperties?: boolean;
      };
    };

export type AgentCancelResponse = {
  success: boolean;
  message: string;
  creditsUsed?: number;
};
