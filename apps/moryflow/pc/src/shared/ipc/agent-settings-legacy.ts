/**
 * [PROVIDES]: preprocessCustomProviderModelEntry - 自定义服务商模型条目 legacy 迁移
 * [DEPENDS]: none
 * [POS]: 统一 main/renderer 的 legacy 数据迁移逻辑，避免 preprocess 重复实现导致行为漂移
 *
 * [PROTOCOL]: 本文件变更时，必须同步更新调用方相关目录的 CLAUDE.md
 */

/**
 * 自定义服务商模型条目兼容层：
 * - 新结构：UserModelConfig（id/enabled/customName/...）
 * - 旧结构：{ id, name, enabled }（将 name 迁移到 customName）
 *
 * 注意：这是用户设置数据，必须兼容历史持久化结构。
 */
export const preprocessCustomProviderModelEntry = (input: unknown): unknown => {
  if (!input || typeof input !== 'object') {
    return input;
  }

  const raw = input as Record<string, unknown> & { name?: unknown; customName?: unknown };

  const enabled = typeof raw.enabled === 'boolean' ? raw.enabled : true;
  const customName =
    typeof raw.customName === 'string'
      ? raw.customName
      : typeof raw.name === 'string'
        ? raw.name
        : undefined;
  const isCustom = typeof raw.isCustom === 'boolean' ? raw.isCustom : true;

  return {
    ...raw,
    enabled,
    isCustom,
    customName,
  };
};
