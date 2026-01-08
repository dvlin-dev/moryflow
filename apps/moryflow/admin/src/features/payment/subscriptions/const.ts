/**
 * 订阅相关常量
 */

export const SUBSCRIPTION_STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '活跃' },
  { value: 'canceled', label: '已取消' },
  { value: 'scheduled_cancel', label: '待取消' },
  { value: 'unpaid', label: '未支付' },
] as const

export const SUBSCRIPTION_TABLE_COLUMNS = [
  { width: 'w-24' },
  { width: 'w-24' },
  { width: 'w-32' },
  { width: 'w-16' },
  { width: 'w-24' },
  { width: 'w-24' },
  { width: 'w-20' },
]
