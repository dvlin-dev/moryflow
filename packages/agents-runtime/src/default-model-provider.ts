/**
 * [PROVIDES]: bindDefaultModelProvider - 将运行时 ModelFactory 绑定为 agents-core 默认 ModelProvider
 * [DEPENDS]: @openai/agents-core setDefaultModelProvider, model-factory
 * [POS]: 统一修复 run() 在 Runner 构造阶段强依赖 defaultModelProvider 的问题
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { setDefaultModelProvider, type ModelProvider } from '@openai/agents-core';

import type { ModelFactory } from './model-factory';

/**
 * 绑定默认模型提供者，避免 run() 在构造默认 Runner 时抛出
 * "No default model provider set"。
 *
 * 注意：
 * - provider 使用 getModelFactory 闭包读取最新工厂，因此 settings 变更后无需重复绑定；
 * - 仅当 Agent 未显式注入 model string 时才会走 provider.getModel。
 */
export const bindDefaultModelProvider = (getModelFactory: () => ModelFactory): void => {
  const provider: ModelProvider = {
    getModel(modelName?: string) {
      return getModelFactory().buildModel(modelName).baseModel;
    },
  };
  setDefaultModelProvider(provider);
};
