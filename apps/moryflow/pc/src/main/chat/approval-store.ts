/**
 * [INPUT]: 工具审批请求（RunToolApprovalItem）
 * [OUTPUT]: 审批挂起/恢复与持久化记录
 * [POS]: PC Chat 主进程的权限审批协调器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { randomUUID } from 'node:crypto';
import type { Agent, RunState, RunToolApprovalItem } from '@openai/agents-core';
import type { AgentContext } from '@moryflow/agents-runtime';
import { getPermissionRuntime } from '../agent-runtime/permission-runtime';
import { getDoomLoopRuntime } from '../agent-runtime/doom-loop-runtime';

export type ApprovalGate = {
  channel: string;
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

const approvalEntries = new Map<string, ApprovalEntry>();
const approvalGates = new Map<string, ApprovalGate>();

export const createApprovalGate = (input: {
  channel: string;
  state: RunState<AgentContext, Agent<AgentContext>>;
}): ApprovalGate => {
  const { channel, state } = input;
  const existing = approvalGates.get(channel);
  if (existing) {
    existing.state = state;
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
  if (!entry) {
    throw new Error('Approval request not found or expired.');
  }

  entry.gate.state.approve(entry.item);

  const doomLoopRuntime = getDoomLoopRuntime();
  doomLoopRuntime?.approve(entry.toolCallId, input.remember);

  const permissionRuntime = getPermissionRuntime();
  if (permissionRuntime) {
    const record = permissionRuntime.getDecision(entry.toolCallId);
    if (record?.decision === 'ask') {
      try {
        if (input.remember === 'always') {
          await permissionRuntime.persistAlwaysRules(record);
        }
        await permissionRuntime.recordDecision(record, 'allow');
      } catch (error) {
        console.error('[approval-store] failed to persist permission decision', error);
      }
    }
  }

  entry.gate.pendingIds.delete(entry.approvalId);
  approvalEntries.delete(entry.approvalId);
  if (entry.gate.pendingIds.size === 0) {
    entry.gate.resolve?.();
  }
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
