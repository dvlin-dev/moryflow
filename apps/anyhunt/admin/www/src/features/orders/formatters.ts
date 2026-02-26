/**
 * [PROVIDES]: orders 展示格式化函数
 * [DEPENDS]: Intl.NumberFormat
 * [POS]: orders 页面与组件共享的展示层格式化
 */

export function formatOrderAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100);
}
