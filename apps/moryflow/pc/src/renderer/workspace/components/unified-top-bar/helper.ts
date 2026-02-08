/**
 * [PROVIDES]: formatTabLabel - Tab 相关工具函数
 * [DEPENDS]: 无
 * [POS]: UnifiedTopBar 工具函数
 */

/** 移除 .md 后缀，用于 Tab 显示 */
export const formatTabLabel = (name: string): string => name.replace(/\.md$/i, '');
