/**
 * [PROVIDES]: createRuntimeCompactionSupport - Runtime 会话压缩与预处理协调
 * [DEPENDS]: agents-runtime compaction, agent settings
 * [POS]: PC Agent Runtime 对话历史压缩子模块
 */

import type { AgentInputItem } from '@openai/agents-core';
import {
  DEFAULT_COMPACTION_CONFIG,
  compactHistory,
  createCompactionPreflightGate,
  generateCompactionSummary,
  type AgentRuntimeConfig,
  type CompactionResult,
  type ModelFactory,
  type Session,
} from '@moryflow/agents-runtime';
import { getAgentSettings } from '../../agent-settings/index.js';
import { resolveCompactionContextWindow } from './runtime-model-utils.js';

type CreateRuntimeCompactionSupportInput = {
  runtimeConfig: AgentRuntimeConfig;
  getModelFactory: () => ModelFactory;
  resolveModelId: (preferredModelId?: string) => string;
};

export type RuntimeCompactionSupport = {
  prepareCompaction: (input: {
    chatId: string;
    preferredModelId?: string;
    session: Session;
  }) => Promise<CompactionResult>;
  consumePreparedOrApply: (input: {
    chatId: string;
    preferredModelId?: string;
    modelId: string;
    session: Session;
  }) => Promise<AgentInputItem[]>;
};

const COMPACTION_PREPARE_TTL_MS = 60_000;

export const createRuntimeCompactionSupport = (
  input: CreateRuntimeCompactionSupportInput
): RuntimeCompactionSupport => {
  const preflightGate = createCompactionPreflightGate({
    ttlMs: COMPACTION_PREPARE_TTL_MS,
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
    const resolvedModelId = args.modelId ?? input.resolveModelId(args.preferredModelId);
    const history = await args.session.getItems();
    const settings = getAgentSettings();
    const contextWindow =
      input.runtimeConfig.compaction?.contextWindow ??
      resolveCompactionContextWindow(resolvedModelId, settings);
    const modelFactory = input.getModelFactory();
    const compaction = await compactHistory({
      history,
      config: {
        ...DEFAULT_COMPACTION_CONFIG,
        ...(input.runtimeConfig.compaction ?? {}),
        contextWindow,
      },
      summaryBuilder: async (items) => {
        const { model } = modelFactory.buildRawModel(resolvedModelId);
        return generateCompactionSummary(model, items);
      },
    });

    if (compaction.triggered) {
      console.info('[agent-runtime] 会话压缩完成', {
        chatId: args.chatId,
        summaryApplied: compaction.summaryApplied,
        beforeTokens: compaction.stats.beforeTokens,
        afterTokens: compaction.stats.afterTokens,
        summaryTokens: compaction.stats.summaryTokens,
        droppedToolTypes: compaction.stats.droppedToolTypes,
      });
    }

    if (compaction.triggered && compaction.historyChanged) {
      await args.session.clearSession();
      if (compaction.history.length > 0) {
        await args.session.addItems(compaction.history);
      }
    }

    return {
      compaction,
      effectiveHistory: compaction.triggered ? compaction.history : history,
      modelId: resolvedModelId,
    };
  };

  return {
    async prepareCompaction({ chatId, preferredModelId, session }) {
      const { compaction, modelId } = await applyCompactionIfNeeded({
        chatId,
        preferredModelId,
        session,
      });
      preflightGate.markPrepared(chatId, modelId);
      return compaction;
    },
    async consumePreparedOrApply({ chatId, preferredModelId, modelId, session }) {
      if (preflightGate.consumePrepared(chatId, modelId)) {
        return await session.getItems();
      }
      return (
        await applyCompactionIfNeeded({
          chatId,
          preferredModelId,
          session,
          modelId,
        })
      ).effectiveHistory;
    },
  };
};
