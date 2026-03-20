import type { AgentInputItem } from '@openai/agents-core';
import {
  DEFAULT_COMPACTION_CONFIG,
  compactHistory,
  createCompactionPreflightGate,
  extractMembershipModelId,
  generateCompactionSummary,
  isMembershipModelId,
  resolveContextWindow,
  type AgentRuntimeConfig,
  type CompactionResult,
  type ModelFactory,
  type Session,
} from '@moryflow/agents-runtime';
import {
  buildProviderModelRef,
  getModelById,
  parseProviderModelRef,
} from '@moryflow/model-bank/registry';

import type { AgentSettings } from '../../../shared/ipc.js';

export const resolveCompactionContextWindow = (
  modelId: string,
  settings: AgentSettings
): number | undefined => {
  if (!modelId) return undefined;
  const isMembership = isMembershipModelId(modelId);
  const normalized = isMembership ? extractMembershipModelId(modelId) : modelId;
  const parsedModelRef = parseProviderModelRef(normalized);
  const canonicalModelRef = parsedModelRef
    ? buildProviderModelRef(parsedModelRef.providerId, parsedModelRef.modelId)
    : null;
  const normalizedModelId = parsedModelRef?.modelId ?? normalized;
  const normalizedProviderId = parsedModelRef?.providerId;
  const providerSources = isMembership
    ? []
    : [...settings.providers, ...(settings.customProviders || [])].filter((provider) =>
        normalizedProviderId ? provider.providerId === normalizedProviderId : true
      );

  return resolveContextWindow({
    modelId: normalizedModelId,
    providers: providerSources,
    getDefaultContext: (id) => {
      if (canonicalModelRef) {
        return getModelById(canonicalModelRef)?.limits?.context;
      }
      if (!normalizedProviderId) {
        return undefined;
      }
      return getModelById(buildProviderModelRef(normalizedProviderId, id))?.limits?.context;
    },
  });
};

export const createCompactionCoordinator = (input: {
  runtimeConfig: AgentRuntimeConfig;
  getSettings: () => AgentSettings;
  getModelFactory: () => ModelFactory;
  getAgentModelId: (preferredModelId?: string) => string;
}) => {
  const { runtimeConfig, getSettings, getModelFactory, getAgentModelId } = input;
  const compactionPreflightGate = createCompactionPreflightGate({
    ttlMs: 60_000,
  });

  const applyCompactionIfNeeded = async (args: {
    chatId: string;
    session: Session;
    preferredModelId?: string;
    modelId?: string;
  }): Promise<{
    compaction: CompactionResult;
    effectiveHistory: AgentInputItem[];
    modelId: string;
  }> => {
    const { chatId, session, preferredModelId, modelId } = args;
    const resolvedModelId = modelId ?? getAgentModelId(preferredModelId);
    const history = await session.getItems();
    const settings = getSettings();
    const contextWindow =
      runtimeConfig.compaction?.contextWindow ??
      resolveCompactionContextWindow(resolvedModelId, settings);
    const compaction = await compactHistory({
      history,
      config: {
        ...DEFAULT_COMPACTION_CONFIG,
        ...(runtimeConfig.compaction ?? {}),
        contextWindow,
      },
      summaryBuilder: async (items) => {
        const { model } = getModelFactory().buildRawModel(resolvedModelId);
        return generateCompactionSummary(model, items);
      },
    });

    if (compaction.triggered) {
      console.info('[agent-runtime] session compaction completed', {
        chatId,
        summaryApplied: compaction.summaryApplied,
        beforeTokens: compaction.stats.beforeTokens,
        afterTokens: compaction.stats.afterTokens,
        summaryTokens: compaction.stats.summaryTokens,
        droppedToolTypes: compaction.stats.droppedToolTypes,
      });
    }

    if (compaction.triggered && compaction.historyChanged) {
      await session.clearSession();
      if (compaction.history.length > 0) {
        await session.addItems(compaction.history);
      }
    }

    return {
      compaction,
      effectiveHistory: compaction.triggered ? compaction.history : history,
      modelId: resolvedModelId,
    };
  };

  return {
    applyCompactionIfNeeded,
    markPrepared: (chatId: string, modelId: string) => {
      compactionPreflightGate.markPrepared(chatId, modelId);
    },
    consumePrepared: (chatId: string, modelId: string) =>
      compactionPreflightGate.consumePrepared(chatId, modelId),
  };
};
