/**
 * [INPUT]: 工具审批请求（RunToolApprovalItem）
 * [OUTPUT]: 审批挂起/恢复与持久化记录
 * [POS]: PC Chat 主进程的权限审批协调器
 * [UPDATE]: 2026-03-03 - 新增审批上下文查询（首次升级提示）与 full_access 切换后的同会话自动放行
 * [UPDATE]: 2026-03-03 - 修复审批竞态与首次提醒消费时机（仅在 UI 准备展示时消费）
 * [UPDATE]: 2026-03-03 - full_access 自动放行改为循环收敛，确保会话内新增审批可继续自动处理
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { randomUUID } from 'node:crypto';
import type { Agent, RunState, RunToolApprovalItem } from '@openai/agents-core';
import type { AgentContext } from '@moryflow/agents-runtime';
import { getPermissionRuntime } from '../agent-runtime/permission-runtime';
import { getDoomLoopRuntime } from '../agent-runtime/doom-loop-runtime';
import { authorizeExternalPath } from '../sandbox/index.js';
import {
  consumeFullAccessUpgradePromptOnce,
  isFullAccessUpgradePromptConsumed,
} from './full-access-upgrade-prompt-store.js';

export type ApprovalGate = {
  channel: string;
  sessionId: string;
  state: RunState<AgentContext, Agent<AgentContext>>;
  pendingIds: Set<string>;
  resolve: (() => void) | null;
  promise: Promise<void>;
};

type ApprovalEntry = {
  approvalId: string;
  toolCallId: string;
  item: RunToolApprovalItem;
  gate: ApprovalGate;
};

type ApprovalContext = {
  suggestFullAccessUpgrade: boolean;
};

const isExternalPathUnapprovedDecision = (rulePattern?: string): boolean =>
  rulePattern === 'external_path_unapproved';

const isVaultAskDecision = (
  record:
    | {
        decision?: 'allow' | 'ask' | 'deny';
        mode?: 'ask' | 'full_access';
        rulePattern?: string;
      }
    | undefined
): boolean =>
  record?.decision === 'ask' &&
  record.mode === 'ask' &&
  !isExternalPathUnapprovedDecision(record.rulePattern);

const settleApprovalEntry = (entry: ApprovalEntry): void => {
  entry.gate.pendingIds.delete(entry.approvalId);
  approvalEntries.delete(entry.approvalId);
  if (entry.gate.pendingIds.size === 0) {
    entry.gate.resolve?.();
  }
};

const isApprovalEntryActive = (entry: ApprovalEntry): boolean =>
  approvalEntries.get(entry.approvalId) === entry && entry.gate.pendingIds.has(entry.approvalId);

const approvalEntries = new Map<string, ApprovalEntry>();
const approvalGates = new Map<string, ApprovalGate>();

const extractFsPaths = (targets: string[]): string[] => {
  const uniquePaths = new Set<string>();
  for (const target of targets) {
    if (!target.startsWith('fs:')) continue;
    const absolutePath = target.slice('fs:'.length).trim();
    if (!absolutePath) continue;
    uniquePaths.add(absolutePath);
  }
  return [...uniquePaths];
};

export const createApprovalGate = (input: {
  channel: string;
  sessionId: string;
  state: RunState<AgentContext, Agent<AgentContext>>;
}): ApprovalGate => {
  const { channel, sessionId, state } = input;
  const existing = approvalGates.get(channel);
  if (existing) {
    existing.state = state;
    existing.sessionId = sessionId;
    existing.pendingIds.clear();
    existing.resolve = null;
    existing.promise = new Promise((resolve) => {
      existing.resolve = resolve;
    });
    return existing;
  }
  let resolveRef: (() => void) | null = null;
  const gate: ApprovalGate = {
    channel,
    sessionId,
    state,
    pendingIds: new Set(),
    resolve: null,
    promise: new Promise((resolve) => {
      resolveRef = resolve;
    }),
  };
  gate.resolve = resolveRef;
  approvalGates.set(channel, gate);
  return gate;
};

export const registerApprovalRequest = (
  gate: ApprovalGate,
  input: {
    toolCallId: string;
    item: RunToolApprovalItem;
  }
): string => {
  const approvalId = randomUUID();
  const entry: ApprovalEntry = {
    approvalId,
    toolCallId: input.toolCallId,
    item: input.item,
    gate,
  };
  gate.pendingIds.add(approvalId);
  approvalEntries.set(approvalId, entry);
  return approvalId;
};

export const hasPendingApprovals = (gate: ApprovalGate): boolean => gate.pendingIds.size > 0;

export const waitForApprovals = async (gate: ApprovalGate): Promise<void> => {
  if (gate.pendingIds.size === 0) return;
  await gate.promise;
};

export const approveToolRequest = async (input: {
  approvalId: string;
  remember: 'once' | 'always';
}): Promise<void> => {
  const entry = approvalEntries.get(input.approvalId);
  if (!entry || !isApprovalEntryActive(entry)) {
    throw new Error('Approval request not found or expired.');
  }

  const permissionRuntime = getPermissionRuntime();
  const record = permissionRuntime?.getDecision(entry.toolCallId);
  const isExternalPathApproval = isExternalPathUnapprovedDecision(record?.rulePattern);
  if (record?.decision === 'ask' && isExternalPathApproval) {
    const externalPaths = extractFsPaths(record.targets);
    if (externalPaths.length === 0) {
      throw new Error('External path authorization target is missing.');
    }
    for (const externalPath of externalPaths) {
      authorizeExternalPath(externalPath);
    }
  }

  entry.gate.state.approve(entry.item);

  const doomLoopRuntime = getDoomLoopRuntime();
  doomLoopRuntime?.approve(entry.toolCallId, input.remember);
  settleApprovalEntry(entry);

  if (permissionRuntime) {
    if (record?.decision === 'ask') {
      try {
        if (isExternalPathApproval) {
          await permissionRuntime.recordDecision(record, 'allow', 'external_path_authorized');
        } else {
          if (input.remember === 'always') {
            await permissionRuntime.persistAlwaysRules(record);
          }
          await permissionRuntime.recordDecision(record, 'allow');
        }
      } catch (error) {
        console.error('[approval-store] failed to persist permission decision', error);
      }
    }
  }
};

export const getApprovalContext = (input: { approvalId: string }): ApprovalContext => {
  const entry = approvalEntries.get(input.approvalId);
  if (!entry) {
    return { suggestFullAccessUpgrade: false };
  }
  if (isFullAccessUpgradePromptConsumed()) {
    return { suggestFullAccessUpgrade: false };
  }
  const record = getPermissionRuntime()?.getDecision(entry.toolCallId);
  if (!isVaultAskDecision(record)) {
    return { suggestFullAccessUpgrade: false };
  }
  return { suggestFullAccessUpgrade: true };
};

export const consumeFullAccessUpgradePromptReminder = (): { consumed: boolean } => ({
  consumed: consumeFullAccessUpgradePromptOnce(),
});

export const autoApprovePendingForSession = async (input: {
  sessionId: string;
}): Promise<number> => {
  const permissionRuntime = getPermissionRuntime();
  const doomLoopRuntime = getDoomLoopRuntime();
  let approvedCount = 0;

  while (true) {
    const sessionEntries = [...approvalEntries.values()].filter(
      (entry) => entry.gate.sessionId === input.sessionId
    );
    let approvedInRound = 0;

    for (const entry of sessionEntries) {
      if (!isApprovalEntryActive(entry)) {
        continue;
      }
      const record = permissionRuntime?.getDecision(entry.toolCallId);
      if (!record || !isVaultAskDecision(record)) {
        continue;
      }
      entry.gate.state.approve(entry.item);
      doomLoopRuntime?.approve(entry.toolCallId, 'once');
      settleApprovalEntry(entry);
      approvedCount += 1;
      approvedInRound += 1;
      if (permissionRuntime) {
        try {
          await permissionRuntime.recordDecision(record, 'allow', 'full_access');
        } catch (error) {
          console.error('[approval-store] failed to record auto-approval decision', error);
        }
      }
    }

    if (approvedInRound === 0) {
      break;
    }

    // 让本轮 approve 触发的后续审批先入队，再继续收敛
    await Promise.resolve();
  }

  return approvedCount;
};

export const clearApprovalGate = (channel: string): void => {
  const gate = approvalGates.get(channel);
  if (!gate) return;
  const doomLoopRuntime = getDoomLoopRuntime();
  const permissionRuntime = getPermissionRuntime();
  for (const approvalId of gate.pendingIds) {
    const entry = approvalEntries.get(approvalId);
    if (entry) {
      doomLoopRuntime?.clear(entry.toolCallId);
      permissionRuntime?.clearDecision(entry.toolCallId);
    }
    approvalEntries.delete(approvalId);
  }
  gate.pendingIds.clear();
  gate.resolve?.();
  approvalGates.delete(channel);
};
