/**
 * [PROVIDES]: HTML 模板和转义工具
 * [DEPENDS]: template/
 * [POS]: 从自动生成的模板导出，并提供工具函数
 */

// 从自动生成的模板目录导出
export { PAGE_TEMPLATE } from '../template/index.js'
export { SIDEBAR_TEMPLATE } from '../template/index.js'
export { STYLES } from '../template/index.js'
export { THEME_INIT_SCRIPT, THEME_TOGGLE_SCRIPT, MENU_TOGGLE_SCRIPT } from '../template/index.js'

/** HTML 转义 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
