/**
 * 订单相关常量
 */

export const ORDER_STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待支付' },
  { value: 'completed', label: '已完成' },
  { value: 'refunded', label: '已退款' },
  { value: 'failed', label: '失败' },
] as const

export const PRODUCT_TYPE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'subscription', label: '订阅' },
  { value: 'credits', label: '积分' },
  { value: 'license', label: 'License' },
] as const

export const PRODUCT_TYPE_LABEL: Record<string, string> = {
  subscription: '订阅',
  credits: '积分',
  license: 'License',
}

export const ORDER_TABLE_COLUMNS = [
  { width: 'w-24' },
  { width: 'w-24' },
  { width: 'w-16' },
  { width: 'w-16' },
  { width: 'w-16' },
  { width: 'w-16' },
  { width: 'w-24' },
  { width: 'w-8' },
]
