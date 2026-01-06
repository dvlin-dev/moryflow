/**
 * [PROVIDES]: ServerTracingProcessor - 将 Agent 执行日志上报到后端的 Processor
 * [DEPENDS]: TracingProcessor, Span, Trace
 * [POS]: 用于 PC/Mobile 端收集 Agent 日志并上报到 Server
 */

import logger from '../logger';
import { TracingProcessor } from './processor';
import { Span, SpanData, FunctionSpanData } from './spans';
import { Trace } from './traces';

// ==========================================
// 类型定义
// ==========================================

/** Span 上报状态 */
export type SpanPayloadStatus = 'pending' | 'success' | 'failed' | 'cancelled';

/** Trace 上报状态 */
export type TracePayloadStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'interrupted';

/** 单个 Span 的上报数据 */
export interface SpanPayload {
  spanId: string;
  parentSpanId?: string;
  type: string;
  name: string;
  status: SpanPayloadStatus;
  duration?: number;
  startedAt: string;
  endedAt?: string;
  // 失败时记录详情
  input?: unknown;
  output?: unknown;
  errorType?: string;
  errorMessage?: string;
  errorStack?: string;
  // generation 类型的 token 消耗
  tokens?: number;
}

/** 单个 Trace 的上报数据 */
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

/** 上报批次数据 */
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
  /** 批量上报回调 */
  onBatchReady: (payload: TraceBatchPayload) => Promise<void>;
  /** 是否记录成功 Span 的 input/output（默认 false，减少数据量） */
  recordSuccessDetails?: boolean;
  /** 是否记录错误堆栈（开发环境用） */
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
      metadata: trace.metadata,
    });
    this.pendingSpans.set(trace.traceId, []);
  }

  async onTraceEnd(trace: Trace): Promise<void> {
    const spans = this.pendingSpans.get(trace.traceId) || [];
    const startTime = this.traceStartTimes.get(trace.traceId);
    const metadata = this.traceMetadata.get(trace.traceId);

    // 清理
    this.pendingSpans.delete(trace.traceId);
    this.traceStartTimes.delete(trace.traceId);
    this.traceMetadata.delete(trace.traceId);

    // 计算统计信息
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

    // 异步上报
    try {
      await this.options.onBatchReady({ traces: [payload] });
    } catch (error) {
      logger.error('Failed to upload agent trace', error);
    }
  }

  async onSpanStart(_span: Span<SpanData>): Promise<void> {
    // 不在 start 时记录
  }

  async onSpanEnd(span: Span<SpanData>): Promise<void> {
    const payload = this.buildSpanPayload(span);
    const spans = this.pendingSpans.get(span.traceId);
    if (spans) {
      spans.push(payload);
    }
  }

  async shutdown(_timeout?: number): Promise<void> {
    // 上报所有待处理的 traces
    for (const [traceId, spans] of this.pendingSpans) {
      const metadata = this.traceMetadata.get(traceId);
      const startTime = this.traceStartTimes.get(traceId);
      const { errorType, errorMessage, totalTokens, turnCount } =
        this.computeTraceStats(spans);

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
        logger.error('Failed to upload agent trace on shutdown', error);
      }
    }

    this.pendingSpans.clear();
    this.traceStartTimes.clear();
    this.traceMetadata.clear();
  }

  async forceFlush(): Promise<void> {
    // 目前不需要强制刷新，因为我们在 trace end 时立即上报
  }

  // ==========================================
  // 私有方法
  // ==========================================

  private buildSpanPayload(span: Span<SpanData>): SpanPayload {
    // 注意：span.error 为 null 时表示成功，不能用 !== undefined 判断
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

    // generation 类型记录 token
    if (data.type === 'generation' && data.usage) {
      base.tokens =
        (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0);
    }

    // 失败时记录完整信息
    if (isFailed) {
      return {
        ...base,
        input: this.truncateValue(this.extractInput(data)),
        output: this.truncateValue(this.extractOutput(data)),
        errorType: span.error?.data?.type || 'Error',
        errorMessage: this.truncateString(
          span.error?.message,
          LIMITS.ERROR_MESSAGE_MAX
        ),
        errorStack: this.options.recordErrorStack
          ? this.truncateString(span.error?.data?.stack, LIMITS.ERROR_STACK_MAX)
          : undefined,
      };
    }

    // 成功时根据配置决定是否记录详情
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
      default:
        return data.type;
    }
  }

  private extractInput(data: SpanData): unknown {
    if (data.type === 'function') {
      return (data as FunctionSpanData).input;
    }
    if (data.type === 'generation') {
      return data.input;
    }
    return undefined;
  }

  private extractOutput(data: SpanData): unknown {
    if (data.type === 'function') {
      return (data as FunctionSpanData).output;
    }
    if (data.type === 'generation') {
      return data.output;
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

  private truncateValue(
    value: unknown,
    maxSize = LIMITS.INPUT_MAX_SIZE
  ): unknown {
    if (value === undefined || value === null) return undefined;
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    if (str.length <= maxSize) return value;
    return str.slice(0, maxSize) + '... [truncated]';
  }

  private truncateString(
    value: string | undefined,
    maxSize: number
  ): string | undefined {
    if (!value) return undefined;
    if (value.length <= maxSize) return value;
    return value.slice(0, maxSize) + '... [truncated]';
  }
}
