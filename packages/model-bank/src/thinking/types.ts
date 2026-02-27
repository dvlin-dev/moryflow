/**
 * [DEFINES]: Thinking Profile 统一类型（等级、可见参数、约束、解析入参）
 * [USED_BY]: src/thinking/*.ts, apps/server, apps/pc, packages/agents-runtime
 * [POS]: model-bank thinking 规则层的领域类型定义
 *
 * [PROTOCOL]: 本文件变更时，必须同步更新 src/thinking/rules.ts 与 src/thinking/resolver.ts
 */

import type { ExtendParamsType } from '../types/aiModel';
import type { ProviderSdkType } from '../types/llm';

export type ThinkingLevelId = string;

export type ThinkingVisibleParamKey =
  | 'reasoningEffort'
  | 'thinkingBudget'
  | 'includeThoughts'
  | 'reasoningSummary'
  | 'thinkingLevel'
  | 'thinkingMode'
  | 'enableReasoning'
  | 'enableAdaptiveThinking'
  | 'effort'
  | string;

export interface ThinkingVisibleParam {
  key: ThinkingVisibleParamKey;
  value: string;
}

export interface ThinkingLevelOption {
  description?: string;
  id: ThinkingLevelId;
  label: string;
  visibleParams: ThinkingVisibleParam[];
}

export type ThinkingConstraintType = 'mutually-exclusive' | 'one-of';

export interface ThinkingConstraint {
  id: string;
  keys: ThinkingVisibleParamKey[];
  reason: string;
  type: ThinkingConstraintType;
}

export type ThinkingProfileSource = 'model-native' | 'off-only';

export interface ModelThinkingProfile {
  /**
   * 当前模型用于驱动 thinking 的主控制键（来自 extendParams）
   */
  activeControl: ExtendParamsType | 'off-only';
  /**
   * 模型声明过的 thinking 相关控制键（用于审计与调试）
   */
  availableControls: ExtendParamsType[];
  constraints: ThinkingConstraint[];
  defaultLevel: ThinkingLevelId;
  levels: ThinkingLevelOption[];
  modelId?: string;
  providerId?: string;
  sdkType?: ProviderSdkType;
  source: ThinkingProfileSource;
  supportsThinking: boolean;
}

export interface ResolveModelThinkingProfileInput {
  /**
   * 模型的 reasoning 能力标记（如缺省，会尝试从内置模型卡推断）
   */
  abilities?: {
    reasoning?: boolean;
  };
  /**
   * 可直接传入扩展参数；为空时会尝试从内置模型卡读取 settings.extendParams
   */
  extendParams?: ExtendParamsType[];
  modelId?: string;
  providerId?: string;
  sdkType?: ProviderSdkType;
}
