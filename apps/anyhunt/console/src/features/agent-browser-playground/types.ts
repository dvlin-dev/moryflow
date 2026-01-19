/**
 * [DEFINES]: Agent/Browser Playground 类型
 * [USED_BY]: agent-stream.ts, api.ts, components/*
 * [POS]: Console Agent Browser Playground 类型定义
 */

export type BrowserSessionInfo = {
  id: string;
  createdAt: string;
  expiresAt: string;
  url: string | null;
  title: string | null;
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

export type AgentCancelResponse = {
  success: boolean;
  message: string;
  creditsUsed?: number;
};

export type AgentEventStarted = {
  type: 'started';
  id: string;
  expiresAt: string;
};

export type AgentEventThinking = {
  type: 'thinking';
  content: string;
};

export type AgentEventToolCall = {
  type: 'tool_call';
  callId: string;
  tool: string;
  args: Record<string, unknown>;
};

export type AgentEventToolResult = {
  type: 'tool_result';
  callId: string;
  tool: string;
  result: unknown;
  error?: string;
};

export type AgentEventProgress = {
  type: 'progress';
  message: string;
  step: number;
  totalSteps?: number;
};

export type AgentEventComplete = {
  type: 'complete';
  data: unknown;
  creditsUsed: number;
};

export type AgentEventFailed = {
  type: 'failed';
  error: string;
  creditsUsed?: number;
  progress?: AgentTaskProgress;
};

export type AgentStreamEvent =
  | AgentEventStarted
  | AgentEventThinking
  | AgentEventToolCall
  | AgentEventToolResult
  | AgentEventProgress
  | AgentEventComplete
  | AgentEventFailed;
