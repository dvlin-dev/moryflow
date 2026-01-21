/**
 * [PROVIDES]: buildProviderOrder
 * [DEPENDS]: none (pure)
 * [POS]: Providers 左侧列表排序策略（避免 UI 在编辑中频繁跳动，仅在外层触发时刷新顺序）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type BuildProviderOrderInput = {
  /** 预设服务商 ID（按 registry 默认顺序） */
  presetProviderIds: string[];
  /** 自定义服务商 ID（按创建顺序） */
  customProviderIds: string[];
  /** 是否启用 */
  isEnabled: (providerId: string) => boolean;
};

/**
 * 构建 Providers 列表顺序：
 * - Enabled 全部排在上面
 * - Disabled 全部排在下面
 * - 同一状态内保持原有顺序稳定（预设按 registry，自定义按创建顺序）
 */
export const buildProviderOrder = (input: BuildProviderOrderInput): string[] => {
  const base = [...input.presetProviderIds, ...input.customProviderIds];

  const enabled: string[] = [];
  const disabled: string[] = [];

  for (const id of base) {
    if (input.isEnabled(id)) enabled.push(id);
    else disabled.push(id);
  }

  return [...enabled, ...disabled];
};
