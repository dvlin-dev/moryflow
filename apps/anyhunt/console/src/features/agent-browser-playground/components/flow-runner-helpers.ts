/**
 * [PROVIDES]: Flow Runner 步骤定义、状态文案与纯函数工具
 * [DEPENDS]: flow-runner-types.ts
 * [POS]: Flow Runner 共享 helper（无副作用）
 */

import type { FlowStep, FlowStepStatus } from './flow-runner-types';

export const parseUrls = (value?: string): string[] =>
  value
    ?.split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

export const stepDefinitions: FlowStep[] = [
  { id: 'create', label: 'Create session', status: 'pending' },
  { id: 'open', label: 'Open URL', status: 'pending' },
  { id: 'snapshot', label: 'Snapshot', status: 'pending' },
  { id: 'screenshot', label: 'Screenshot', status: 'pending' },
  { id: 'estimate', label: 'Estimate credits', status: 'pending' },
  { id: 'agent', label: 'Run agent', status: 'pending' },
  { id: 'status', label: 'Check status', status: 'pending' },
  { id: 'close', label: 'Close session', status: 'pending' },
];

export const statusLabel: Record<FlowStepStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  success: 'Success',
  failed: 'Failed',
};

export const createPendingSteps = (): FlowStep[] =>
  stepDefinitions.map((step) => ({ ...step, status: 'pending', detail: undefined }));

export const getRunButtonLabel = (running: boolean): string => {
  if (running) {
    return 'Running...';
  }
  return 'Run Flow';
};

export const getStepBadgeVariant = (status: FlowStepStatus): 'destructive' | 'secondary' => {
  if (status === 'failed') {
    return 'destructive';
  }
  return 'secondary';
};
