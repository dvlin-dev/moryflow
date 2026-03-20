import { randomUUID } from 'node:crypto';
import type { Agent, RunState, RunToolApprovalItem } from '@openai/agents-core';
import type { AgentContext } from '@moryflow/agents-runtime';
import { getPermissionRuntime } from '../../../agent-runtime/permissions/permission-runtime.js';
import { getDoomLoopRuntime } from '../../../agent-runtime/doom-loop-runtime';
import { authorizeExternalPath } from '../../../sandbox/index.js';
import { getGlobalPermissionModeSync } from '../../../agent-runtime/runtime-config.js';
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

export type ApprovalAction = 'once' | 'allow_type' | 'deny';

export type ApproveToolRequestResult =
  | {
      status: 'approved';
      remember: 'once' | 'always';
    }
  | {
      status: 'denied';
    }
  | {
      status: 'already_processed';
      reason: 'missing' | 'expired' | 'processing';
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
const processingApprovalIds = new Set<string>();

const collectGateApprovalIds = (gate: ApprovalGate): string[] => {
  const ids = new Set<string>(gate.pendingIds);
  for (const [approvalId, entry] of approvalEntries) {
    if (entry.gate === gate) {
      ids.add(approvalId);
    }
  }
  return [...ids];
};

const clearApprovalEntryById = (approvalId: string): void => {
  processingApprovalIds.delete(approvalId);
  approvalEntries.delete(approvalId);
};

const disposeGateApprovals = (gate: ApprovalGate): void => {
  const doomLoopRuntime = getDoomLoopRuntime();
  const permissionRuntime = getPermissionRuntime();
  for (const approvalId of collectGateApprovalIds(gate)) {
    const entry = approvalEntries.get(approvalId);
    if (entry) {
      doomLoopRuntime?.clear(entry.toolCallId);
      permissionRuntime?.clearDecision(entry.toolCallId);
    }
    gate.pendingIds.delete(approvalId);
    clearApprovalEntryById(approvalId);
  }
};

const isGlobalFullAccessMode = (): boolean => {
  try {
    return getGlobalPermissionModeSync() === 'full_access';
  } catch {
    return false;
  }
};

const tryAutoApproveEntry = async (
  entry: ApprovalEntry,
  input: {
    permissionRuntime: ReturnType<typeof getPermissionRuntime>;
    doomLoopRuntime: ReturnType<typeof getDoomLoopRuntime>;
  }
): Promise<boolean> => {
  if (!isGlobalFullAccessMode()) {
    return false;
  }
  if (!isApprovalEntryActive(entry) || processingApprovalIds.has(entry.approvalId)) {
    return false;
  }
  const record = input.permissionRuntime?.getDecision(entry.toolCallId);
  if (!record || !isVaultAskDecision(record)) {
    return false;
  }

  processingApprovalIds.add(entry.approvalId);
  try {
    if (!isApprovalEntryActive(entry)) {
      return false;
    }
    entry.gate.state.approve(entry.item);
    input.doomLoopRuntime?.approve(entry.toolCallId, 'once');
    settleApprovalEntry(entry);
    if (input.permissionRuntime) {
      try {
        await input.permissionRuntime.recordDecision(record, 'allow', 'full_access');
      } catch (error) {
        console.error('[approval-store] failed to record auto-approval decision', error);
      }
    }
    return true;
  } finally {
    processingApprovalIds.delete(entry.approvalId);
  }
};

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
    disposeGateApprovals(existing);
    existing.state = state;
    existing.sessionId = sessionId;
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
): string | null => {
  const approvalId = randomUUID();
  const entry: ApprovalEntry = {
    approvalId,
    toolCallId: input.toolCallId,
    item: input.item,
    gate,
  };
  gate.pendingIds.add(approvalId);
  approvalEntries.set(approvalId, entry);
  void tryAutoApproveEntry(entry, {
    permissionRuntime: getPermissionRuntime(),
    doomLoopRuntime: getDoomLoopRuntime(),
  });
  if (!isApprovalEntryActive(entry)) {
    return null;
  }
  return approvalId;
};

export const hasPendingApprovals = (gate: ApprovalGate): boolean => gate.pendingIds.size > 0;

export const waitForApprovals = async (gate: ApprovalGate): Promise<void> => {
  if (gate.pendingIds.size === 0) return;
  await gate.promise;
};

export const approveToolRequest = async (input: {
  approvalId: string;
  action: ApprovalAction;
}): Promise<ApproveToolRequestResult> => {
  const entry = approvalEntries.get(input.approvalId);
  if (!entry) {
    return { status: 'already_processed', reason: 'missing' };
  }
  if (processingApprovalIds.has(input.approvalId)) {
    return { status: 'already_processed', reason: 'processing' };
  }
  if (!isApprovalEntryActive(entry)) {
    return { status: 'already_processed', reason: 'expired' };
  }
  processingApprovalIds.add(input.approvalId);

  try {
    const resolvedAction: ApprovalAction = input.action;
    const permissionRuntime = getPermissionRuntime();
    const record = permissionRuntime?.getDecision(entry.toolCallId);
    const isExternalPathApproval = isExternalPathUnapprovedDecision(record?.rulePattern);
    const doomLoopRuntime = getDoomLoopRuntime();

    if (resolvedAction === 'deny') {
      entry.gate.state.reject(entry.item);
      doomLoopRuntime?.clear(entry.toolCallId);
      if (permissionRuntime && record?.decision === 'ask') {
        try {
          await permissionRuntime.recordDecision(record, 'deny', 'approval_denied_once');
        } catch (error) {
          console.error('[approval-store] failed to record permission deny decision', error);
        }
      }
      settleApprovalEntry(entry);
      return { status: 'denied' };
    }

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
    let allowTypePersisted = false;
    if (resolvedAction === 'allow_type') {
      if (permissionRuntime && record?.decision === 'ask') {
        try {
          allowTypePersisted = await permissionRuntime.persistAlwaysRules(record);
        } catch (error) {
          console.error('[approval-store] failed to persist allow_type policy', error);
          allowTypePersisted = false;
        }
      }
      if (!allowTypePersisted) {
        console.warn(
          '[approval-store] allow_type rule was not persisted, fallback to once approval'
        );
      }
    }
    const remember: 'once' | 'always' =
      resolvedAction === 'allow_type' && allowTypePersisted ? 'always' : 'once';
    doomLoopRuntime?.approve(entry.toolCallId, remember);

    if (permissionRuntime && record?.decision === 'ask') {
      try {
        if (isExternalPathApproval) {
          await permissionRuntime.recordDecision(record, 'allow', 'external_path_authorized');
        } else if (resolvedAction === 'allow_type' && !allowTypePersisted) {
          await permissionRuntime.recordDecision(
            record,
            'allow',
            'allow_type_persist_failed_fallback_once'
          );
        } else {
          await permissionRuntime.recordDecision(record, 'allow');
        }
      } catch (error) {
        console.error('[approval-store] failed to persist permission decision', error);
      }
    }
    settleApprovalEntry(entry);
    return { status: 'approved', remember };
  } finally {
    processingApprovalIds.delete(input.approvalId);
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
      const approved = await tryAutoApproveEntry(entry, { permissionRuntime, doomLoopRuntime });
      if (approved) {
        approvedCount += 1;
        approvedInRound += 1;
      }
    }

    if (approvedInRound === 0) {
      break;
    }

    await Promise.resolve();
  }

  return approvedCount;
};

export const clearApprovalGate = (channel: string): void => {
  const gate = approvalGates.get(channel);
  if (!gate) return;
  disposeGateApprovals(gate);
  gate.pendingIds.clear();
  gate.resolve?.();
  approvalGates.delete(channel);
};
