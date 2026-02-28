/**
 * [DEFINES]: model-bank registry/search 兼容类型
 * [USED_BY]: src/registry/index.ts 与 PC/Mobile/Admin 调用方
 * [POS]: 提供替代 agents-model-registry / model-registry-data 的稳定类型面
 */

export type ModelModality = 'text' | 'image' | 'audio' | 'video' | 'pdf';

export type ThinkingLevelId = string;

export interface ThinkingVisibleParam {
  key: string;
  value: string;
}

export interface ThinkingLevelOption {
  description?: string;
  id: ThinkingLevelId;
  label: string;
  visibleParams?: ThinkingVisibleParam[];
}

export interface ModelThinkingProfile {
  defaultLevel: ThinkingLevelId;
  levels: ThinkingLevelOption[];
  supportsThinking: boolean;
}

export interface ModelThinkingOverride {
  defaultLevel?: ThinkingLevelId;
}

export interface ModelCapabilities {
  attachment: boolean;
  openWeights: boolean;
  reasoning: boolean;
  temperature: boolean;
  toolCall: boolean;
}

export interface ModelModalities {
  input: ModelModality[];
  output: ModelModality[];
}

export interface ModelLimits {
  context: number;
  output: number;
}

export type ModelCategory = 'chat' | 'image' | 'embedding' | 'asr' | 'tts';

export interface PresetModel {
  capabilities: ModelCapabilities;
  category: ModelCategory;
  id: string;
  knowledgeCutoff?: string;
  limits: ModelLimits;
  modalities: ModelModalities;
  name: string;
  releaseDate?: string;
  shortName?: string;
}

export interface PresetProvider {
  allowCustomModels?: boolean;
  authType: 'api-key' | 'oauth' | 'none';
  defaultBaseUrl?: string;
  description?: string;
  docUrl?: string;
  hidden?: boolean;
  icon?: string;
  id: string;
  localBackend?: string;
  modelIdMapping?: Record<string, string>;
  modelIds: string[];
  nativeApiBaseUrl?: string;
  name: string;
  sdkType: 'openai' | 'anthropic' | 'google' | 'xai' | 'openrouter' | 'openai-compatible' | string;
  sortOrder?: number;
}

export type ProviderSdkType = PresetProvider['sdkType'];

export type ModelRegistry = Record<string, Omit<PresetModel, 'id'>>;
export type ProviderRegistry = Record<string, PresetProvider>;

export interface ModelInfo {
  capabilities: {
    audio: boolean;
    json: boolean;
    pdf: boolean;
    reasoning: boolean;
    tools: boolean;
    vision: boolean;
  };
  deprecated: boolean;
  deprecationDate?: string;
  displayName: string;
  id: string;
  inputPricePerMillion: number;
  maxContextTokens: number;
  maxOutputTokens: number;
  mode: string;
  outputPricePerMillion: number;
  provider: string;
  providerName: string;
}

export interface ProviderInfo {
  id: string;
  modelCount: number;
  name: string;
}

export interface SearchOptions {
  includeDeprecated?: boolean;
  limit?: number;
  mode?: 'chat' | 'embedding' | 'image_generation';
  provider?: string;
  query: string;
}

export interface SyncMeta {
  modelCount: number;
  providerCount: number;
  source: string;
  syncedAt: string;
}
