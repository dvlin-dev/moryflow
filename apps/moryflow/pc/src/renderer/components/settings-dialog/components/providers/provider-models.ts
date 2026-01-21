/**
 * [PROVIDES]: isModelEnabledWithDefaultFirst, findFirstEnabledModelId
 * [DEPENDS]: none (pure)
 * [POS]: Providers 设置页的模型启用策略与“取第一个启用模型”逻辑，供 UI 和测试按钮复用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type MinimalUserModelConfig = { id: string; enabled: boolean };

/**
 * 判断模型是否启用（对齐 agents-runtime 的默认策略）：
 * - 当用户还没有任何显式模型配置时：默认只启用列表中的第一个模型
 * - 一旦用户显式配置过任意模型：仅以显式配置为准，未配置的模型视为禁用
 */
export const isModelEnabledWithDefaultFirst = (
  userModels: MinimalUserModelConfig[],
  modelId: string,
  modelIndex: number
): boolean => {
  const modelConfig = userModels.find((m) => m.id === modelId);
  if (modelConfig) return Boolean(modelConfig.enabled);
  if (userModels.length > 0) return false;
  return modelIndex === 0;
};

/**
 * 按传入顺序找到第一个启用模型 ID（用于“基于用户开启模型的第一个进行测试”）。
 */
export const findFirstEnabledModelId = (
  modelIds: string[],
  isEnabled: (modelId: string, modelIndex: number) => boolean
): string | null => {
  for (let i = 0; i < modelIds.length; i++) {
    const id = modelIds[i];
    if (isEnabled(id, i)) return id;
  }
  return null;
};
