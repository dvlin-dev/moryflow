/**
 * [DEFINES]: FlowStepStatus/FlowStep/FlowRunnerResult
 * [USED_BY]: flow-runner.tsx 与 flow-runner-* 子组件
 * [POS]: Flow Runner 共享类型定义
 */

import type {
  AgentEstimateResponse,
  AgentTaskResult,
  BrowserOpenResponse,
  BrowserScreenshotResponse,
  BrowserSessionInfo,
  BrowserSnapshotResponse,
} from '../types';

export type FlowStepStatus = 'pending' | 'running' | 'success' | 'failed';

export type FlowStep = {
  id: string;
  label: string;
  status: FlowStepStatus;
  detail?: string;
};

export type FlowRunnerResult = {
  session?: BrowserSessionInfo;
  open?: BrowserOpenResponse;
  snapshot?: BrowserSnapshotResponse;
  screenshot?: BrowserScreenshotResponse;
  estimate?: AgentEstimateResponse;
  agent?: AgentTaskResult;
  status?: AgentTaskResult | null;
};
