export const CODE_TYPE_OPTIONS = [
  { value: 'CREDITS', label: 'Credits' },
  { value: 'MEMBERSHIP', label: 'Membership' },
] as const;

export const CODE_TYPE_BADGE_VARIANTS: Record<string, string> = {
  CREDITS: 'bg-blue-100 text-blue-800',
  MEMBERSHIP: 'bg-purple-100 text-purple-800',
};

export const MEMBERSHIP_TIER_OPTIONS = [
  { value: 'BASIC', label: 'Basic' },
  { value: 'PRO', label: 'Pro' },
  { value: 'TEAM', label: 'Team' },
] as const;

export const ACTIVE_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
] as const;
