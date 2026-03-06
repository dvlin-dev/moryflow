import type { ReasoningEffort } from '@/types/api';

/** 思考强度选项 */
export const REASONING_EFFORT_OPTIONS: { value: ReasoningEffort; label: string }[] = [
  { value: 'xhigh', label: '极高 (xhigh)' },
  { value: 'high', label: '高 (high)' },
  { value: 'medium', label: '中 (medium)' },
  { value: 'low', label: '低 (low)' },
  { value: 'minimal', label: '最小 (minimal)' },
  { value: 'none', label: '无 (none)' },
];
