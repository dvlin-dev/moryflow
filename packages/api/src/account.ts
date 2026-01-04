/**
 * 账户相关常量和类型
 */

// 删除原因选项
export const DELETION_REASONS = [
  { code: 'not_useful', label: '不再需要这个产品', labelEn: 'No longer need this product' },
  { code: 'found_alternative', label: '找到了更好的替代品', labelEn: 'Found a better alternative' },
  { code: 'too_expensive', label: '价格太贵', labelEn: 'Too expensive' },
  { code: 'too_complex', label: '使用太复杂', labelEn: 'Too complex to use' },
  { code: 'bugs_issues', label: '问题和故障太多', labelEn: 'Too many bugs and issues' },
  { code: 'other', label: '其他原因', labelEn: 'Other reason' },
] as const

export type DeletionReasonCode = (typeof DELETION_REASONS)[number]['code']

// 删除账户请求参数
export interface DeleteAccountRequest {
  reason: DeletionReasonCode
  feedback?: string
  confirmation: string
}
