import { Agent, type ModelSettings, type Tool } from '@openai/agents-core';

import type { ModelFactory } from './model-factory';
import { getMorySystemPrompt } from './prompt';
import { normalizeToolSchemasForInterop } from './tool-schema-compat';
import {
  isMembershipModelId,
  type AgentContext,
  type ModelThinkingProfile,
  type ThinkingSelection,
} from './types';

export interface AgentFactoryOptions {
  getModelFactory(): ModelFactory;
  baseTools: Tool<AgentContext>[];
  getMcpTools(): Tool<AgentContext>[];
  getInstructions?: () => string;
  getModelSettings?: () => ModelSettings | undefined;
}

export interface AgentFactory {
  getAgent(
    preferredModelId?: string,
    options?: { thinking?: ThinkingSelection; thinkingProfile?: ModelThinkingProfile }
  ): { agent: Agent<AgentContext>; modelId: string };
  invalidate(): void;
}

/**
 * 创建 Agent 工厂
 * 负责管理 Agent 实例与缓存，确保不同模型复用同一构建逻辑
 */
export const createAgentFactory = ({
  getModelFactory,
  baseTools,
  getMcpTools,
  getInstructions,
  getModelSettings,
}: AgentFactoryOptions): AgentFactory => {
  const agentCache = new Map<string, Agent<AgentContext>>();

  const buildAgent = (
    modelId: string,
    thinking?: ThinkingSelection,
    thinkingProfile?: ModelThinkingProfile
  ) => {
    const { baseModel } = getModelFactory().buildModel(modelId, {
      thinking,
      thinkingProfile,
    });
    const instructions = getInstructions?.() ?? getMorySystemPrompt();
    const modelSettings = getModelSettings?.();
    const runtimeTools = normalizeToolSchemasForInterop([...baseTools, ...getMcpTools()]);
    const config = {
      name: 'Mory',
      instructions,
      model: baseModel,
      tools: runtimeTools,
      ...(modelSettings ? { modelSettings } : {}),
    };
    return new Agent(config);
  };

  const resolveThinkingCacheKey = (thinking?: ThinkingSelection): string => {
    if (!thinking || thinking.mode === 'off') {
      return 'off';
    }
    return `level:${thinking.level}`;
  };

  const resolveThinkingProfileCacheKey = (
    profile?: ModelThinkingProfile
  ): string => {
    if (!profile) {
      return 'none';
    }
    return JSON.stringify({
      supportsThinking: profile.supportsThinking,
      defaultLevel: profile.defaultLevel,
      levels: profile.levels.map((level) => ({
        id: level.id,
        label: level.label,
      })),
    });
  };

  const getAgent = (
    preferredModelId?: string,
    options?: { thinking?: ThinkingSelection; thinkingProfile?: ModelThinkingProfile }
  ) => {
    const requestedThinkingProfile = options?.thinkingProfile
    const { modelId } = getModelFactory().buildModel(preferredModelId, {
      thinking: options?.thinking,
      thinkingProfile: requestedThinkingProfile,
    });
    const effectiveThinkingProfile = isMembershipModelId(modelId)
      ? requestedThinkingProfile
      : undefined
    const cacheKey = `${modelId}::${resolveThinkingCacheKey(options?.thinking)}::${resolveThinkingProfileCacheKey(effectiveThinkingProfile)}`;
    let agent = agentCache.get(cacheKey);
    if (!agent) {
      agent = buildAgent(modelId, options?.thinking, effectiveThinkingProfile);
      agentCache.set(cacheKey, agent);
    }
    return { agent, modelId };
  };

  const invalidate = () => {
    agentCache.clear();
  };

  return { getAgent, invalidate };
};
