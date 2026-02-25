// 用户等级类型
export type UserTier = 'free' | 'starter' | 'basic' | 'pro';

// 积分类型
export type CreditType = 'subscription' | 'purchased';

// 用户基本信息
export interface User {
  id: string;
  email: string;
  subscriptionTier: UserTier;
  isAdmin: boolean;
  credits?: number;
  createdAt: string;
  deletedAt?: string | null;
}

// 用户详情
export interface UserDetails {
  user: User;
  credits: {
    subscription: number;
    purchased: number;
    total: number;
  };
  deletionRecord?: {
    reason: string;
    feedback: string | null;
    deletedAt: string;
  } | null;
}

// 系统统计
export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  deletedUsers: number;
  totalCreditsUsed: number;
  totalApiCalls: number;
  usersByTier: Record<UserTier, number>;
}

// 删除记录
export interface DeletionRecord {
  id: string;
  userId: string;
  email: string;
  reason: string;
  feedback?: string | null;
  deletedAt: string;
}

// 删除记录列表响应
export interface DeletionRecordListResponse {
  records: DeletionRecord[];
  pagination: {
    count: number;
    limit: number;
    offset: number;
  };
}

// 删除统计
export interface DeletionStats {
  totalDeleted: number;
  byReason: Record<string, number>;
}

// 健康状态 (匹配后端 HealthCheckResponse)
export interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: boolean;
    redis: boolean;
  };
}

// 活动日志（新版）
export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  targetUserId?: string;
  targetUserEmail?: string;
  category: string;
  action: string;
  level: 'info' | 'warn' | 'error';
  details: Record<string, unknown> | null;
  ip?: string;
  userAgent?: string;
  duration?: number;
  createdAt: string;
}

// 存储统计
export interface ActivityLogStorageStats {
  totalCount: number;
  estimatedSizeMB: number;
  oldestLogDate: string | null;
  countByCategory: Record<string, number>;
  countByLevel: Record<string, number>;
}

// API 响应类型
export interface UserListResponse {
  users: User[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}

// 活动日志列表响应
export interface ActivityLogListResponse {
  logs: ActivityLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// ==================== AI Provider & Model Types ====================

// Provider SDK 类型
export type ProviderSdkType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'openrouter'
  | 'openai-compatible';

// 预设 Provider 类型
export interface PresetProvider {
  id: string;
  name: string;
  sdkType: ProviderSdkType;
  defaultBaseUrl?: string;
  docUrl: string;
  description?: string;
}

// AI Provider
export interface AiProvider {
  id: string;
  providerType: string;
  name: string;
  apiKey: string; // 前端显示时会被遮盖
  baseUrl: string | null;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// AI Model
export interface AiModel {
  id: string;
  providerId: string;
  modelId: string;
  upstreamId: string;
  displayName: string;
  enabled: boolean;
  inputTokenPrice: number;
  outputTokenPrice: number;
  minTier: UserTier;
  maxContextTokens: number;
  maxOutputTokens: number;
  capabilitiesJson: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Model 能力
export interface ModelCapabilities {
  vision?: boolean;
  tools?: boolean;
  json?: boolean;
  maxContextTokens: number;
  maxOutputTokens: number;
  /** 深度推理配置 */
  reasoning?: ReasoningConfig;
}

/** 深度推理配置 */
export interface ReasoningConfig {
  /** 是否启用深度推理模式 */
  enabled: boolean;
  /** 思考强度（xhigh/high/medium/low/minimal/none） */
  effort?: 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none';
  /** 思考 token 预算（可选） */
  maxTokens?: number;
  /** 是否在响应中排除思考内容 */
  exclude?: boolean;
  /** 原生配置覆盖（高级选项，直接透传给 API，会覆盖上方的通用配置） */
  rawConfig?: Record<string, unknown>;
}

/** 思考强度选项 */
export type ReasoningEffort = 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none';

// API 响应
export interface PresetProvidersResponse {
  providers: PresetProvider[];
}

export interface ProvidersResponse {
  providers: AiProvider[];
}

export interface ProviderResponse {
  provider: AiProvider;
}

export interface ModelsResponse {
  models: AiModel[];
}

export interface ModelResponse {
  model: AiModel;
}

// 创建/更新请求类型
export interface CreateProviderRequest {
  providerType: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  enabled?: boolean;
  sortOrder?: number;
}

export interface UpdateProviderRequest {
  providerType?: string;
  name?: string;
  apiKey?: string;
  baseUrl?: string | null;
  enabled?: boolean;
  sortOrder?: number;
}

export interface CreateModelRequest {
  providerId: string;
  modelId: string;
  upstreamId: string;
  displayName: string;
  enabled?: boolean;
  inputTokenPrice: number;
  outputTokenPrice: number;
  minTier: UserTier;
  maxContextTokens: number;
  maxOutputTokens: number;
  capabilities: {
    vision?: boolean;
    tools?: boolean;
    json?: boolean;
  };
  /** 深度推理配置 */
  reasoning?: ReasoningConfig;
  sortOrder?: number;
}

export interface UpdateModelRequest {
  modelId?: string;
  upstreamId?: string;
  displayName?: string;
  enabled?: boolean;
  inputTokenPrice?: number;
  outputTokenPrice?: number;
  minTier?: UserTier;
  maxContextTokens?: number;
  maxOutputTokens?: number;
  capabilities?: {
    vision?: boolean;
    tools?: boolean;
    json?: boolean;
  };
  /** 深度推理配置 */
  reasoning?: ReasoningConfig;
  sortOrder?: number;
}
