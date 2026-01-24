/**
 * [INPUT]: Trace/Span - @openai/agents-core tracing 数据
 * [OUTPUT]: TraceBatchPayload - 可直接上报到服务端的批次结构
 * [POS]: PC 主进程的 Agent tracing 适配层
 * [NOTE]: 增加 span 名称兜底分支，补充安全序列化
 *
 * [PROTOCOL]: 本文件变更时，必须更新 Header 及所属目录 CLAUDE.md
 */

import {
  type TracingProcessor,
  type Span,
  type SpanData,
  type FunctionSpanData,
  type GenerationSpanData,
  type ResponseSpanData,
  type Trace,
} from '@openai/agents-core';

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
      metadata: metadata?.metadata,
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

  async onSpanStart(_span: Span<SpanData>): Promise<void> {
    // no-op
  }

  async onSpanEnd(span: Span<SpanData>): Promise<void> {
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
        metadata: metadata?.metadata,
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

  private buildSpanPayload(span: Span<SpanData>): SpanPayload {
    const isFailed = span.error != null;
    const data = span.spanData;
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

  private getSpanName(data: SpanData): string {
    switch (data.type) {
      case 'function':
      case 'agent':
      case 'guardrail':
      case 'custom':
        return data.name;
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

  private extractInput(data: SpanData): unknown {
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

  private extractOutput(data: SpanData): unknown {
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
}
