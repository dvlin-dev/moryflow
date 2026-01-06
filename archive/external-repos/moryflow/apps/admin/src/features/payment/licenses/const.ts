/**
 * License 相关常量
 */

export const LICENSE_STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '有效' },
  { value: 'revoked', label: '已撤销' },
] as const

export const LICENSE_TIER_LABEL: Record<string, string> = {
  standard: '标准版',
  pro: '专业版',
}

export const LICENSE_TABLE_COLUMNS = [
  { width: 'w-32' },
  { width: 'w-24' },
  { width: 'w-16' },
  { width: 'w-12' },
  { width: 'w-16' },
  { width: 'w-24' },
  { width: 'w-16' },
]
