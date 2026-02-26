/**
 * [DEFINES]: Agent Runtime 核心类型与上下文协议
 * [USED_BY]: agents-runtime 全模块与多端运行时
 * [POS]: 运行时类型中心
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { RunContext, Model } from '@openai/agents-core';

/**
 * 附件上下文
 */
export interface AgentAttachmentContext {
  filename?: string;
  mediaType?: string;
  content?: string;
  truncated?: boolean;
  filePath?: string;
}

/**
 * 聊天上下文
 */
export interface AgentChatContext {
  /** 当前聚焦的文件路径（相对 Vault） */
  filePath?: string;
  /** 额外的上下文摘要 */
  summary?: string;
}

/**
 * 模型构建器函数类型
 */
export type ModelBuilder = (modelId?: string) => { modelId: string; baseModel: Model };

/**
 * 会话级访问模式
 */
export type AgentAccessMode = 'agent' | 'full_access';

/**
 * Agent 运行时上下文
 * 通过 RunContext 注入到所有工具中
 */
export interface AgentContext {
  /** 会话级访问模式 */
  mode?: AgentAccessMode;
  /** 当前 Vault 的根目录绝对路径 */
  vaultRoot: string;
  /** 当前会话 ID */
  chatId: string;
  /** 可选的用户标识 */
  userId?: string;
  /** 模型构建器，用于子代理创建时获取配置好的模型 */
  buildModel?: ModelBuilder;
}

/**
 * 从 RunContext 中提取 vaultRoot
 */
export const getVaultRootFromContext = (
  runContext?: RunContext<AgentContext>
): string | undefined => runContext?.context?.vaultRoot;

/**
 * 服务商 SDK 类型
 */
export type ProviderSdkType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'xai'
  | 'openrouter'
  | 'openai-compatible';

/**
 * 内置思考等级
 */
export type BuiltinThinkingLevelId =
  | 'off'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'max'
  | 'xhigh';

/**
 * 思考等级（支持扩展自定义等级）
 */
export type ThinkingLevelId = BuiltinThinkingLevelId | (string & {});

/**
 * 请求级思考选择
 */
export type ThinkingSelection = { mode: 'off' } | { mode: 'level'; level: ThinkingLevelId };

/**
 * 思考等级选项
 */
export interface ThinkingLevelOption {
  id: ThinkingLevelId;
  label: string;
  description?: string;
}

/**
 * 模型思考能力档案
 */
export interface ModelThinkingProfile {
  supportsThinking: boolean;
  defaultLevel: ThinkingLevelId;
  levels: ThinkingLevelOption[];
}

/**
 * OpenAI/OpenAI-compatible/xAI 思考 patch
 */
export interface ThinkingPatchOpenAICompatible {
  reasoningEffort?: Exclude<ReasoningConfig['effort'], 'none'>;
}

/**
 * OpenRouter 思考 patch
 */
export interface ThinkingPatchOpenRouter {
  effort?: Exclude<ReasoningConfig['effort'], 'none'>;
  maxTokens?: number;
  exclude?: boolean;
  rawConfig?: Record<string, unknown>;
}

/**
 * Anthropic 思考 patch
 */
export interface ThinkingPatchAnthropic {
  budgetTokens?: number;
}

/**
 * Google 思考 patch
 */
export interface ThinkingPatchGoogle {
  thinkingBudget?: number;
  includeThoughts?: boolean;
}

/**
 * 单个 level 在各 provider 的 patch 集合
 */
export interface ThinkingLevelProviderPatches {
  openai?: ThinkingPatchOpenAICompatible;
  'openai-compatible'?: ThinkingPatchOpenAICompatible;
  xai?: ThinkingPatchOpenAICompatible;
  openrouter?: ThinkingPatchOpenRouter;
  anthropic?: ThinkingPatchAnthropic;
  google?: ThinkingPatchGoogle;
}

/**
 * 用户级模型思考覆写
 */
export interface ModelThinkingOverride {
  defaultLevel?: ThinkingLevelId;
  enabledLevels?: ThinkingLevelId[];
  levelPatches?: Record<string, ThinkingLevelProviderPatches>;
}

/**
 * 用户模型配置
 */
export interface UserModelConfig {
  id: string;
  enabled: boolean;
  isCustom?: boolean;
  customCapabilities?: {
    reasoning?: boolean;
    attachment?: boolean;
    temperature?: boolean;
    toolCall?: boolean;
  };
  thinking?: ModelThinkingOverride;
}

/**
 * 用户服务商配置
 */
export interface UserProviderConfig {
  providerId: string;
  enabled: boolean;
  apiKey: string | null;
  baseUrl?: string | null;
  models: UserModelConfig[];
  defaultModelId?: string | null;
}

/**
 * 自定义服务商配置
 */
export interface CustomProviderConfig {
  providerId: string;
  name: string;
  enabled: boolean;
  sdkType: ProviderSdkType;
  apiKey: string | null;
  baseUrl?: string | null;
  models: UserModelConfig[];
  defaultModelId?: string | null;
}

/**
 * 全局模型设置
 */
export interface AgentModelSettings {
  /** 全局默认模型 ID（格式: providerId/modelId） */
  defaultModel: string | null;
}

/**
 * Agent 设置
 */
export interface AgentSettings {
  /** 全局模型设置 */
  model: AgentModelSettings;
  /** 预设服务商配置 */
  providers: UserProviderConfig[];
  /** 自定义服务商配置 */
  customProviders: CustomProviderConfig[];
}

/**
 * 预设服务商定义
 */
export interface PresetProvider {
  id: string;
  name: string;
  sdkType: ProviderSdkType;
  modelIds: string[];
  defaultBaseUrl?: string;
}

/**
 * Token 使用量
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Reasoning/思考模式配置
 */
export interface ReasoningConfig {
  /** 是否启用 reasoning */
  enabled: boolean;

  /**
   * 思考强度等级（OpenRouter/OpenAI 风格）
   * - xhigh: ~95% max_tokens
   * - high: ~80% max_tokens
   * - medium: ~50% max_tokens
   * - low: ~20% max_tokens
   * - minimal: ~10% max_tokens
   * - none: 禁用
   */
  effort?: 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none';

  /** 思考 token 预算（Anthropic/Gemini 风格） */
  maxTokens?: number;

  /** 是否在响应中排除思考内容 */
  exclude?: boolean;

  /** 是否包含思考内容（Gemini 风格） */
  includeThoughts?: boolean;

  /** 原生配置覆盖（OpenRouter 等 provider 的高级透传） */
  rawConfig?: Record<string, unknown>;
}

/**
 * 会员模型配置
 */
export interface MembershipConfig {
  /** 是否启用会员模型 */
  enabled: boolean;
  /** 会员 API 地址 */
  apiUrl: string;
  /** 用户的 session token */
  token: string | null;
}

// 从共享包重新导出会员模型相关常量和工具函数
export {
  MEMBERSHIP_MODEL_PREFIX,
  isMembershipModelId,
  extractMembershipModelId,
  buildMembershipModelId,
} from '@moryflow/api';
