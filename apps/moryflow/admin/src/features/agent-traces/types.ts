/**
 * Agent Traces 类型定义
 */

// ==========================================
// 状态枚举
// ==========================================

export type TraceStatus = 'pending' | 'completed' | 'failed' | 'interrupted'

export type SpanStatus = 'pending' | 'success' | 'failed' | 'cancelled'

export type SpanType =
  | 'agent'
  | 'function'
  | 'generation'
  | 'handoff'
  | 'guardrail'
  | 'custom'

// ==========================================
// 实体类型
// ==========================================

export interface AgentTrace {
  id: string
  traceId: string
  groupId?: string
  userId: string
  agentName: string
  agentType?: string
  status: TraceStatus
  turnCount: number
  totalTokens: number
  duration?: number
  errorType?: string
  errorMessage?: string
  metadata?: Record<string, unknown>
  startedAt: string
  completedAt?: string
  user?: {
    id: string
    email: string
    name?: string
  }
  _count?: {
    spans: number
  }
  spans?: AgentSpan[]
}

export interface AgentSpan {
  id: string
  traceId: string
  spanId: string
  parentSpanId?: string
  type: SpanType
  name: string
  status: SpanStatus
  duration?: number
  tokens?: number
  input?: unknown
  output?: unknown
  errorType?: string
  errorMessage?: string
  errorStack?: string
  startedAt: string
  endedAt?: string
  trace?: {
    agentName: string
    groupId?: string
    user?: {
      id: string
      email: string
    }
  }
}

// ==========================================
// API 响应类型
// ==========================================

export interface Pagination {
  total: number
  limit: number
  offset: number
}

export interface TracesResponse {
  traces: AgentTrace[]
  pagination: Pagination
}

export interface FailedToolsResponse {
  spans: AgentSpan[]
  pagination: Pagination
}

export interface DailyStat {
  date: string
  successCount: number
  failedCount: number
}

export interface ToolDistribution {
  name: string
  count: number
  percentage: number
}

export interface StatsResponse {
  totalRuns: number
  successRate: number
  failedToolCount: number
  avgDuration: number
  trends: {
    totalRuns: number
    successRate: number
    failedToolCount: number
    avgDuration: number
  }
  dailyStats: DailyStat[]
  toolDistribution: ToolDistribution[]
}

export interface ToolStat {
  name: string
  totalCalls: number
  successCount: number
  failedCount: number
  successRate: number
  avgDuration: number | null
}

export interface AgentStat {
  agentName: string
  totalRuns: number
  completedCount: number
  failedCount: number
  successRate: number
  avgDuration: number | null
  avgTurns: number | null
  totalTokens: number
}

// ==========================================
// 查询参数类型
// ==========================================

export interface TracesQuery {
  status?: TraceStatus
  agentName?: string
  userId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface FailedToolsQuery {
  toolName?: string
  agentName?: string
  errorType?: string
  userId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface StatsQuery {
  days?: number
}

// ==========================================
// 存储统计类型
// ==========================================

export interface StorageStatsResponse {
  // 清理服务配置
  retentionSuccess: number
  retentionFailed: number
  pendingCleanup: {
    success: number
    failed: number
    pending: number
  }
  // 存储统计
  traceCount: number
  spanCount: number
  oldestDate: string | null
  newestDate: string | null
  countByStatus: Record<string, number>
  estimatedSizeMB: number
}

export interface CleanupResponse {
  success: boolean
  message: string
  deletedCount: number
  duration: number
}
