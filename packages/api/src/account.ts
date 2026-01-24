/**
 * [DEFINES]: 删除账户原因与请求类型
 * [USED_BY]: Moryflow PC/Mobile 删除账户流程
 * [POS]: 账户删除的共享常量与类型
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

// 删除原因选项
export const DELETION_REASONS = [
  { code: 'not_useful', label: 'No longer need this product' },
  { code: 'found_alternative', label: 'Found a better alternative' },
  { code: 'too_expensive', label: 'Too expensive' },
  { code: 'too_complex', label: 'Too complex to use' },
  { code: 'bugs_issues', label: 'Too many bugs and issues' },
  { code: 'other', label: 'Other reason' },
] as const;

export type DeletionReasonCode = (typeof DELETION_REASONS)[number]['code'];

// 删除账户请求参数
export interface DeleteAccountRequest {
  reason: DeletionReasonCode;
  feedback?: string;
  confirmation: string;
}
