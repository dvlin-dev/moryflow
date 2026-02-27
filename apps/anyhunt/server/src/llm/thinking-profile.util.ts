/**
 * [PROVIDES]: thinking_profile contract 解析 + thinking 选择到 reasoning 映射（统一复用 model-bank）
 * [DEPENDS]: @moryflow/model-bank thinking contract
 * [POS]: Anyhunt LLM thinking 能力边界（AgentModelService + LlmLanguageModelService 共用）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { BadRequestException } from '@nestjs/common';
import {
  buildThinkingProfileFromCapabilities as resolveThinkingProfileContract,
  resolveReasoningFromThinkingSelection as resolveReasoningFromThinkingContract,
  ThinkingContractError,
  type ThinkingContractLevel,
  type ThinkingContractProfile,
  type ThinkingSelection,
  type ThinkingVisibleParam,
} from '@moryflow/model-bank';
import type { ReasoningOptions } from './providers/model-provider.factory';

export type LlmThinkingSelection = ThinkingSelection;
export type ThinkingVisibleParamKey = ThinkingVisibleParam['key'];
export type ThinkingLevelProfile = ThinkingContractLevel;
export type ThinkingProfile = ThinkingContractProfile;

export type ThinkingBoundaryErrorCode =
  | 'THINKING_LEVEL_INVALID'
  | 'THINKING_NOT_SUPPORTED';

const buildThinkingError = (params: {
  code: ThinkingBoundaryErrorCode;
  message: string;
  details?: unknown;
}): BadRequestException =>
  new BadRequestException({
    code: params.code,
    message: params.message,
    ...(params.details !== undefined ? { details: params.details } : {}),
  });

const toBoundaryError = (error: unknown): never => {
  if (!(error instanceof ThinkingContractError)) {
    throw error;
  }
  throw buildThinkingError({
    code: error.code,
    message: error.message,
    details: error.details,
  });
};

export function buildThinkingProfileFromCapabilities(input: {
  modelId?: string;
  providerType: string;
  capabilitiesJson: unknown;
}): ThinkingProfile {
  return resolveThinkingProfileContract({
    modelId: input.modelId,
    providerId: input.providerType,
    capabilitiesJson: input.capabilitiesJson,
  });
}

export function resolveReasoningFromThinkingSelection(input: {
  modelId?: string;
  providerType: string;
  capabilitiesJson: unknown;
  thinking: LlmThinkingSelection;
}): ReasoningOptions | undefined {
  try {
    return resolveReasoningFromThinkingContract({
      modelId: input.modelId,
      providerId: input.providerType,
      capabilitiesJson: input.capabilitiesJson,
      thinking: input.thinking,
    });
  } catch (error) {
    toBoundaryError(error);
  }
}

export function toPublicThinkingProfile(
  profile: ThinkingProfile,
): ThinkingProfile {
  return {
    supportsThinking: profile.supportsThinking,
    defaultLevel: profile.defaultLevel,
    levels: profile.levels.map((level) => ({
      id: level.id,
      label: level.label,
      ...(level.description ? { description: level.description } : {}),
      ...(level.visibleParams && level.visibleParams.length > 0
        ? { visibleParams: level.visibleParams }
        : {}),
    })),
  };
}
