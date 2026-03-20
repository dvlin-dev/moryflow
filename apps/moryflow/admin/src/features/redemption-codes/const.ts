export const CODE_TYPE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'CREDITS', label: '积分' },
  { value: 'MEMBERSHIP', label: '会员' },
] as const;

export const ACTIVE_STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'true', label: '活跃' },
  { value: 'false', label: '已停用' },
] as const;

export const CODE_TYPE_LABEL: Record<string, string> = {
  CREDITS: '积分',
  MEMBERSHIP: '会员',
};
