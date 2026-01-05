/**
 * [PROVIDES]: formatTabLabel, isToolTab - Tab 相关工具函数
 * [DEPENDS]: 无
 * [POS]: UnifiedTopBar 工具函数
 */

/** AI Tab 的固定 ID */
export const AI_TAB_ID = '__mory_ai__'

/** Sites Tab 的固定 ID */
export const SITES_TAB_ID = '__sites__'

/** 移除 .md 后缀，用于 Tab 显示 */
export const formatTabLabel = (name: string): string => name.replace(/\.md$/i, '')

/** 判断是否为工具 Tab（AI 或 Sites） */
export const isToolTab = (path: string): boolean => path === AI_TAB_ID || path === SITES_TAB_ID
