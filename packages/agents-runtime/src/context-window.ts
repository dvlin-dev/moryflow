/**
 * [PROVIDES]: resolveContextWindow - 上下文窗口解析（customContext + 默认限制）
 * [DEPENDS]: none
 * [POS]: Agent Runtime 的上下文预算计算入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type ProviderModelContextSource = {
  models?: Array<{
    id?: string;
    customContext?: number | null;
  }>;
};

export type ResolveContextWindowInput = {
  modelId?: string;
  providers?: ProviderModelContextSource[];
  getDefaultContext?: (modelId: string) => number | undefined;
};

const normalizeContext = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.floor(value);
};

const findCustomContext = (
  modelId: string,
  providers: ProviderModelContextSource[]
): number | undefined => {
  for (const provider of providers) {
    const models = provider.models ?? [];
    for (const model of models) {
      if (model?.id !== modelId) continue;
      const customContext = normalizeContext(model.customContext);
      if (customContext) {
        return customContext;
      }
    }
  }
  return undefined;
};

export const resolveContextWindow = (input: ResolveContextWindowInput): number | undefined => {
  const { modelId, providers = [], getDefaultContext } = input;
  if (!modelId) return undefined;
  const customContext = findCustomContext(modelId, providers);
  if (customContext) return customContext;
  return getDefaultContext?.(modelId);
};
