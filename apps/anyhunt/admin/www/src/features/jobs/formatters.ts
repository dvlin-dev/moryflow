/**
 * [PROVIDES]: jobs 展示格式化函数
 * [DEPENDS]: Date
 * [POS]: Job 详情与列表时间展示统一入口
 */

export function formatJobDateTime(dateStr: string | null): string {
  if (!dateStr) {
    return '-';
  }

  return new Date(dateStr).toLocaleString('zh-CN');
}
