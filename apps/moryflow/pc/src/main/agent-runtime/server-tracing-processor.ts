/**
 * [INPUT]: Trace/Span - @openai/agents-core tracing 数据
 * [OUTPUT]: TraceBatchPayload - 可直接上报到服务端的批次结构
 * [POS]: PC 主进程的 Agent tracing 适配层
 * [NOTE]: 增加 span 名称兜底分支，补充安全序列化（SpanData 本地兼容）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { type TracingProcessor, type Span, type Trace } from '@openai/agents-core';

// ==========================================
// 类型定义
// ==========================================

export type SpanPayloadStatus = 'pending' | 'success' | 'failed' | 'cancelled';

export type TracePayloadStatus = 'pending' | 'completed' | 'failed' | 'interrupted';

export interface SpanPayload {
  spanId: string;
  parentSpanId?: string;
  type: string;
  name: string;
  status: SpanPayloadStatus;
  duration?: number;
  startedAt: string;
  endedAt?: string;
  input?: unknown;
  output?: unknown;
  errorType?: string;
  errorMessage?: string;
  errorStack?: string;
  tokens?: number;
}

export interface TracePayload {
  traceId: string;
  groupId?: string;
  agentName: string;
  agentType?: string;
  status: TracePayloadStatus;
  turnCount?: number;
  totalTokens?: number;
  duration?: number;
  errorType?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  spans: SpanPayload[];
}

export interface TraceBatchPayload {
  traces: TracePayload[];
}

type TraceMetadataRecord = Record<string, unknown>;

type TraceSpanDataBase = {
  type: string;
  name?: string;
  model?: string;
  response_id?: string;
  to_agent?: string;
  server?: string;
  usage?: Record<string, number>;
  input?: unknown;
  output?: unknown;
  _input?: unknown;
  _response?: unknown;
};

type FunctionSpanData = TraceSpanDataBase & {
  type: 'function';
  name: string;
  input: string;
  output: string;
  mcp_data?: string;
};

type GenerationSpanData = TraceSpanDataBase & {
  type: 'generation';
  input?: Array<Record<string, any>>;
  output?: Array<Record<string, any>>;
  model?: string;
  usage?: Record<string, number>;
};

type ResponseSpanData = TraceSpanDataBase & {
  type: 'response';
  response_id?: string;
  _input?: string | Record<string, any>[];
  _response?: Record<string, any>;
};

type TraceSpanData = FunctionSpanData | GenerationSpanData | ResponseSpanData | TraceSpanDataBase;

// ==========================================
// 配置和常量
// ==========================================

const LIMITS = {
  INPUT_MAX_SIZE: 4096,
  OUTPUT_MAX_SIZE: 4096,
  ERROR_MESSAGE_MAX: 2048,
  ERROR_STACK_MAX: 4096,
} as const;

export interface ServerTracingProcessorOptions {
  onBatchReady: (payload: TraceBatchPayload) => Promise<void>;
  recordSuccessDetails?: boolean;
  recordErrorStack?: boolean;
}

// ==========================================
// ServerTracingProcessor 实现
// ==========================================

export class ServerTracingProcessor implements TracingProcessor {
  private pendingSpans: Map<string, SpanPayload[]> = new Map();
  private traceStartTimes: Map<string, number> = new Map();
  private traceMetadata: Map<
    string,
    { name: string; groupId?: string; metadata?: Record<string, unknown> }
  > = new Map();
  private options: Required<ServerTracingProcessorOptions>;

  constructor(options: ServerTracingProcessorOptions) {
    this.options = {
      recordSuccessDetails: false,
      recordErrorStack: false,
      ...options,
    };
  }

  async onTraceStart(trace: Trace): Promise<void> {
    this.traceStartTimes.set(trace.traceId, Date.now());
    this.traceMetadata.set(trace.traceId, {
      name: trace.name,
      groupId: trace.groupId ?? undefined,
      metadata: trace.metadata as Record<string, unknown> | undefined,
    });
    this.pendingSpans.set(trace.traceId, []);
  }

  async onTraceEnd(trace: Trace): Promise<void> {
    const spans = this.pendingSpans.get(trace.traceId) || [];
    const startTime = this.traceStartTimes.get(trace.traceId);
    const metadata = this.traceMetadata.get(trace.traceId);

    this.pendingSpans.delete(trace.traceId);
    this.traceStartTimes.delete(trace.traceId);
    this.traceMetadata.delete(trace.traceId);

    const { status, errorType, errorMessage, totalTokens, turnCount } =
      this.computeTraceStats(spans);

    const payload: TracePayload = {
      traceId: trace.traceId,
      groupId: metadata?.groupId,
      agentName: metadata?.name || 'Unknown',
      status,
      turnCount,
      totalTokens,
      duration: startTime ? Date.now() - startTime : undefined,
      errorType,
      errorMessage,
      metadata: this.normalizeTraceMetadata(metadata?.metadata, spans),
      startedAt: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
      completedAt: new Date().toISOString(),
      spans,
    };

    try {
      await this.options.onBatchReady({ traces: [payload] });
    } catch (error) {
      console.error('[agent-tracing] Failed to upload agent trace', error);
    }
  }

  async onSpanStart(_span: Span<any>): Promise<void> {
    // no-op
  }

  async onSpanEnd(span: Span<any>): Promise<void> {
    const payload = this.buildSpanPayload(span);
    const spans = this.pendingSpans.get(span.traceId);
    if (spans) {
      spans.push(payload);
    }
  }

  async shutdown(): Promise<void> {
    for (const [traceId, spans] of this.pendingSpans) {
      const metadata = this.traceMetadata.get(traceId);
      const startTime = this.traceStartTimes.get(traceId);
      const { errorType, errorMessage, totalTokens, turnCount } = this.computeTraceStats(spans);

      const payload: TracePayload = {
        traceId,
        groupId: metadata?.groupId,
        agentName: metadata?.name || 'Unknown',
        status: 'interrupted',
        turnCount,
        totalTokens,
        duration: startTime ? Date.now() - startTime : undefined,
        errorType,
        errorMessage,
        metadata: this.normalizeTraceMetadata(metadata?.metadata, spans),
        startedAt: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
        completedAt: new Date().toISOString(),
        spans,
      };

      try {
        await this.options.onBatchReady({ traces: [payload] });
      } catch (error) {
        console.error('[agent-tracing] Failed to upload agent trace on shutdown', error);
      }
    }

    this.pendingSpans.clear();
    this.traceStartTimes.clear();
    this.traceMetadata.clear();
  }

  async forceFlush(): Promise<void> {
    // 使用 trace end 即时上报，不需要额外 flush
  }

  // ==========================================
  // 私有方法
  // ==========================================

  private buildSpanPayload(span: Span<any>): SpanPayload {
    const isFailed = span.error != null;
    const data = span.spanData as TraceSpanData;
    const startedAt = span.startedAt || new Date().toISOString();
    const endedAt = span.endedAt || new Date().toISOString();
    const duration = this.calculateDuration(startedAt, endedAt);

    const base: SpanPayload = {
      spanId: span.spanId,
      parentSpanId: span.parentId ?? undefined,
      type: data.type,
      name: this.getSpanName(data),
      status: isFailed ? 'failed' : 'success',
      duration,
      startedAt,
      endedAt,
    };

    if (data.type === 'generation' && data.usage) {
      const usage = data.usage as Record<string, number>;
      base.tokens = (usage.input_tokens || 0) + (usage.output_tokens || 0);
    }

    if (isFailed) {
      return {
        ...base,
        input: this.truncateValue(this.extractInput(data)),
        output: this.truncateValue(this.extractOutput(data)),
        errorType: (span.error?.data as { type?: string } | undefined)?.type || 'Error',
        errorMessage: this.truncateString(span.error?.message, LIMITS.ERROR_MESSAGE_MAX),
        errorStack: this.options.recordErrorStack
          ? this.truncateString(
              (span.error?.data as { stack?: string } | undefined)?.stack,
              LIMITS.ERROR_STACK_MAX
            )
          : undefined,
      };
    }

    if (this.options.recordSuccessDetails) {
      return {
        ...base,
        input: this.truncateValue(this.extractInput(data)),
        output: this.truncateValue(this.extractOutput(data)),
      };
    }

    return base;
  }

  private getSpanName(data: TraceSpanData): string {
    switch (data.type) {
      case 'function':
      case 'agent':
      case 'guardrail':
      case 'custom':
        return data.name ?? 'unknown';
      case 'handoff':
        return `handoff:${data.to_agent || 'unknown'}`;
      case 'generation':
        return data.model || 'generation';
      case 'response':
        return data.response_id || 'response';
      case 'transcription':
        return data.model || 'transcription';
      case 'speech':
        return data.model || 'speech';
      case 'speech_group':
        return 'speech_group';
      case 'mcp_tools':
        return data.server ? `mcp_tools:${data.server}` : 'mcp_tools';
      default:
        return 'unknown';
    }
  }

  private extractInput(data: TraceSpanData): unknown {
    if (data.type === 'function') {
      return (data as FunctionSpanData).input;
    }
    if (data.type === 'generation') {
      return (data as GenerationSpanData).input;
    }
    if (data.type === 'response') {
      return (data as ResponseSpanData)._input;
    }
    return undefined;
  }

  private extractOutput(data: TraceSpanData): unknown {
    if (data.type === 'function') {
      return (data as FunctionSpanData).output;
    }
    if (data.type === 'generation') {
      return (data as GenerationSpanData).output;
    }
    if (data.type === 'response') {
      return (data as ResponseSpanData)._response;
    }
    return undefined;
  }

  private computeTraceStats(spans: SpanPayload[]): {
    status: TracePayloadStatus;
    errorType?: string;
    errorMessage?: string;
    totalTokens: number;
    turnCount: number;
  } {
    let hasFailed = false;
    let errorType: string | undefined;
    let errorMessage: string | undefined;
    let totalTokens = 0;
    let turnCount = 0;

    for (const span of spans) {
      if (span.status === 'failed') {
        hasFailed = true;
        errorType = span.errorType;
        errorMessage = span.errorMessage;
      }
      if (span.tokens) {
        totalTokens += span.tokens;
      }
      if (span.type === 'agent') {
        turnCount++;
      }
    }

    return {
      status: hasFailed ? 'failed' : 'completed',
      errorType,
      errorMessage,
      totalTokens,
      turnCount,
    };
  }

  private calculateDuration(startedAt: string, endedAt: string): number {
    try {
      return new Date(endedAt).getTime() - new Date(startedAt).getTime();
    } catch {
      return 0;
    }
  }

  private truncateValue(value: unknown, maxSize = LIMITS.INPUT_MAX_SIZE): unknown {
    if (value === undefined || value === null) return undefined;
    const str = this.serializeValue(value);
    if (str.length <= maxSize) return value;
    return str.slice(0, maxSize) + '... [truncated]';
  }

  private truncateString(value: string | undefined, maxSize: number): string | undefined {
    if (!value) return undefined;
    if (value.length <= maxSize) return value;
    return value.slice(0, maxSize) + '... [truncated]';
  }

  private serializeValue(value: unknown): string {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return '[unserializable]';
    }
  }

  private normalizeTraceMetadata(
    metadata: Record<string, unknown> | undefined,
    spans: SpanPayload[]
  ): Record<string, unknown> | undefined {
    const source = this.asRecord(metadata);
    if (!source) {
      return undefined;
    }
    const runtime = this.asRecord(source?.['runtime']);
    const permission = this.asRecord(source?.['permission']);
    const approval = this.asRecord(source?.['approval']);
    const compaction =
      this.asRecord(source?.['compaction']) ?? this.asRecord(source?.['compactionStats']);
    const doomLoop = this.asRecord(source?.['doomLoop']) ?? this.asRecord(source?.['doom_loop']);

    const normalized: TraceMetadataRecord = {};
    for (const [key, value] of Object.entries(source)) {
      if (
        key === 'runtime' ||
        key === 'permission' ||
        key === 'model' ||
        key === 'compactionStats' ||
        key === 'doom_loop'
      ) {
        continue;
      }
      normalized[key] = value;
    }
    normalized['platform'] =
      this.readString(source, 'platform') ?? this.readString(runtime, 'platform') ?? 'pc';

    const mode = this.readString(source, 'mode') ?? this.readString(runtime, 'mode');
    if (mode) {
      normalized['mode'] = mode;
    }

    const modelId =
      this.readString(source, 'modelId') ??
      this.readString(source, 'model') ??
      this.inferModelIdFromSpans(spans);
    if (modelId) {
      normalized['modelId'] = modelId;
    }

    const normalizedApproval = this.normalizeApprovalMetadata(approval, permission);
    if (normalizedApproval) {
      normalized['approval'] = normalizedApproval;
    }

    const normalizedCompaction = this.normalizeMarkerMetadata(compaction);
    if (normalizedCompaction) {
      normalized['compaction'] = normalizedCompaction;
    }

    const normalizedDoomLoop = this.normalizeMarkerMetadata(doomLoop);
    if (normalizedDoomLoop) {
      normalized['doomLoop'] = normalizedDoomLoop;
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
  }

  private normalizeApprovalMetadata(
    approval: TraceMetadataRecord | null,
    permission: TraceMetadataRecord | null
  ): TraceMetadataRecord | null {
    if (approval) {
      return { ...approval };
    }
    if (!permission) {
      return null;
    }

    const decision = this.readString(permission, 'decision');
    const toolName = this.readString(permission, 'toolName');
    const targets = Array.isArray(permission['targets'])
      ? permission['targets'].filter((item): item is string => typeof item === 'string')
      : [];
    const target = targets[0];

    const normalized: TraceMetadataRecord = {
      requested: decision === 'ask',
    };
    if (toolName) {
      normalized['toolName'] = toolName;
    }
    if (target) {
      normalized['target'] = target;
    }
    if (decision) {
      normalized['decision'] = decision;
    }
    return normalized;
  }

  private normalizeMarkerMetadata(section: TraceMetadataRecord | null): TraceMetadataRecord | null {
    if (!section) {
      return null;
    }
    return { ...section };
  }

  private inferModelIdFromSpans(spans: SpanPayload[]): string | undefined {
    for (const span of spans) {
      if (span.type === 'generation' && span.name && span.name !== 'generation') {
        return span.name;
      }
    }
    return undefined;
  }

  private asRecord(value: unknown): TraceMetadataRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as TraceMetadataRecord;
  }

  private readString(
    value: TraceMetadataRecord | null | undefined,
    key: string
  ): string | undefined {
    const candidate = value?.[key];
    return typeof candidate === 'string' && candidate.trim().length > 0
      ? candidate.trim()
      : undefined;
  }
}
