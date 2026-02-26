/**
 * [PROVIDES]: 浏览器监控展示格式化函数
 * [DEPENDS]: number
 * [POS]: Browser 页面与子组件的统一格式化入口
 */

export function formatBrowserDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }

  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function formatBrowserMemory(gb: number): string {
  return `${gb.toFixed(2)} GB`;
}
