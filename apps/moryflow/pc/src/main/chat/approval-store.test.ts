/* @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetPermissionRuntime, mockGetDoomLoopRuntime, mockAuthorizeExternalPath } = vi.hoisted(
  () => ({
    mockGetPermissionRuntime: vi.fn(),
    mockGetDoomLoopRuntime: vi.fn(),
    mockAuthorizeExternalPath: vi.fn(),
  })
);

const { mockConsumeFullAccessUpgradePromptOnce, mockIsFullAccessUpgradePromptConsumed } =
  vi.hoisted(() => ({
    mockConsumeFullAccessUpgradePromptOnce: vi.fn(),
    mockIsFullAccessUpgradePromptConsumed: vi.fn(),
  }));

const { mockGetGlobalPermissionModeSync } = vi.hoisted(() => ({
  mockGetGlobalPermissionModeSync: vi.fn(),
}));

vi.mock('../agent-runtime/permission-runtime', () => ({
  getPermissionRuntime: mockGetPermissionRuntime,
}));

vi.mock('../agent-runtime/doom-loop-runtime', () => ({
  getDoomLoopRuntime: mockGetDoomLoopRuntime,
}));

vi.mock('../sandbox/index.js', () => ({
  authorizeExternalPath: mockAuthorizeExternalPath,
}));

vi.mock('./full-access-upgrade-prompt-store.js', () => ({
  consumeFullAccessUpgradePromptOnce: mockConsumeFullAccessUpgradePromptOnce,
  isFullAccessUpgradePromptConsumed: mockIsFullAccessUpgradePromptConsumed,
}));

vi.mock('../agent-runtime/runtime-config.js', () => ({
  getGlobalPermissionModeSync: mockGetGlobalPermissionModeSync,
}));

import {
  approveToolRequest,
  autoApprovePendingForSession,
  clearApprovalGate,
  consumeFullAccessUpgradePromptReminder,
  createApprovalGate,
  getApprovalContext,
  hasPendingApprovals,
  registerApprovalRequest,
} from './approval-store.js';

describe('approval-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFullAccessUpgradePromptConsumed.mockReturnValue(false);
    mockConsumeFullAccessUpgradePromptOnce.mockReturnValue(true);
    mockGetGlobalPermissionModeSync.mockReturnValue('ask');
  });

  afterEach(() => {
    clearApprovalGate('external');
    clearApprovalGate('vault');
    clearApprovalGate('session-5-channel');
    clearApprovalGate('session-6-channel');
    clearApprovalGate('session-7-channel');
    clearApprovalGate('session-8-channel');
    clearApprovalGate('session-reuse-channel');
  });

  it('external_path_unapproved 审批通过后写入 external paths（永久）', async () => {
    const persistAlwaysRules = vi.fn().mockResolvedValue(undefined);
    const recordDecision = vi.fn().mockResolvedValue(undefined);
    const getDecision = vi.fn().mockReturnValue({
      toolName: 'read',
      callId: 'call-1',
      domain: 'read',
      targets: ['fs:/external/docs/a.md'],
      decision: 'ask',
      rulePattern: 'external_path_unapproved',
      sessionId: 'session-1',
      mode: 'ask',
    });
    mockGetPermissionRuntime.mockReturnValue({
      getDecision,
      persistAlwaysRules,
      recordDecision,
      clearDecision: vi.fn(),
    });
    mockGetDoomLoopRuntime.mockReturnValue({
      approve: vi.fn(),
      clear: vi.fn(),
    });

    const state = { approve: vi.fn() };
    const gate = createApprovalGate({
      channel: 'external',
      sessionId: 'session-1',
      state: state as never,
    });
    const approvalId = registerApprovalRequest(gate, {
      toolCallId: 'tool-call-1',
      item: {} as never,
    });

    await approveToolRequest({ approvalId, action: 'once' });

    expect(mockAuthorizeExternalPath).toHaveBeenCalledWith('/external/docs/a.md');
    expect(state.approve).toHaveBeenCalledTimes(1);
    expect(persistAlwaysRules).not.toHaveBeenCalled();
    expect(recordDecision).toHaveBeenCalledWith(
      expect.objectContaining({ rulePattern: 'external_path_unapproved' }),
      'allow',
      'external_path_authorized'
    );
    expect(hasPendingApprovals(gate)).toBe(false);
  });

  it('external_path_unapproved + action=allow_type 会写入同类 allow 规则', async () => {
    const persistAlwaysRules = vi.fn().mockResolvedValue(undefined);
    const recordDecision = vi.fn().mockResolvedValue(undefined);
    mockGetPermissionRuntime.mockReturnValue({
      getDecision: vi.fn().mockReturnValue({
        toolName: 'read',
        callId: 'call-ext-allow-type',
        domain: 'read',
        targets: ['fs:/external/docs/a.md'],
        decision: 'ask',
        rulePattern: 'external_path_unapproved',
        sessionId: 'session-ext-allow-type',
        mode: 'ask',
      }),
      persistAlwaysRules,
      recordDecision,
      clearDecision: vi.fn(),
    });
    mockGetDoomLoopRuntime.mockReturnValue({
      approve: vi.fn(),
      clear: vi.fn(),
    });

    const gate = createApprovalGate({
      channel: 'external',
      sessionId: 'session-ext-allow-type',
      state: { approve: vi.fn() } as never,
    });
    const approvalId = registerApprovalRequest(gate, {
      toolCallId: 'tool-call-ext-allow-type',
      item: {} as never,
    });

    await approveToolRequest({ approvalId, action: 'allow_type' });

    expect(persistAlwaysRules).toHaveBeenCalledTimes(1);
    expect(recordDecision).toHaveBeenCalledWith(
      expect.objectContaining({ rulePattern: 'external_path_unapproved' }),
      'allow',
      'external_path_authorized'
    );
  });

  it('普通 ask + action=allow_type 仍走 permission rules 持久化', async () => {
    const persistAlwaysRules = vi.fn().mockResolvedValue(undefined);
    const recordDecision = vi.fn().mockResolvedValue(undefined);
    mockGetPermissionRuntime.mockReturnValue({
      getDecision: vi.fn().mockReturnValue({
        toolName: 'write',
        callId: 'call-2',
        domain: 'edit',
        targets: ['vault:/docs/a.md'],
        decision: 'ask',
        rulePattern: 'vault:**',
        sessionId: 'session-2',
        mode: 'ask',
      }),
      persistAlwaysRules,
      recordDecision,
      clearDecision: vi.fn(),
    });
    mockGetDoomLoopRuntime.mockReturnValue({
      approve: vi.fn(),
      clear: vi.fn(),
    });

    const state = { approve: vi.fn() };
    const gate = createApprovalGate({
      channel: 'vault',
      sessionId: 'session-2',
      state: state as never,
    });
    const approvalId = registerApprovalRequest(gate, {
      toolCallId: 'tool-call-2',
      item: {} as never,
    });

    await approveToolRequest({ approvalId, action: 'allow_type' });

    expect(mockAuthorizeExternalPath).not.toHaveBeenCalled();
    expect(state.approve).toHaveBeenCalledTimes(1);
    expect(persistAlwaysRules).toHaveBeenCalledTimes(1);
    expect(recordDecision).toHaveBeenCalledWith(
      expect.objectContaining({ rulePattern: 'vault:**' }),
      'allow'
    );
    expect(hasPendingApprovals(gate)).toBe(false);
  });

  it('action=deny 仅拒绝当前请求且不持久化 allow 规则', async () => {
    const persistAlwaysRules = vi.fn().mockResolvedValue(undefined);
    const recordDecision = vi.fn().mockResolvedValue(undefined);
    const doomClear = vi.fn();
    mockGetPermissionRuntime.mockReturnValue({
      getDecision: vi.fn().mockReturnValue({
        toolName: 'write',
        callId: 'call-2-deny',
        domain: 'edit',
        targets: ['vault:/docs/a.md'],
        decision: 'ask',
        rulePattern: 'vault:**',
        sessionId: 'session-2-deny',
        mode: 'ask',
      }),
      persistAlwaysRules,
      recordDecision,
      clearDecision: vi.fn(),
    });
    mockGetDoomLoopRuntime.mockReturnValue({
      approve: vi.fn(),
      clear: doomClear,
    });

    const state = { approve: vi.fn(), reject: vi.fn() };
    const gate = createApprovalGate({
      channel: 'vault',
      sessionId: 'session-2-deny',
      state: state as never,
    });
    const approvalId = registerApprovalRequest(gate, {
      toolCallId: 'tool-call-2-deny',
      item: {} as never,
    });

    const result = await approveToolRequest({ approvalId, action: 'deny' });

    expect(result).toEqual({ status: 'denied' });
    expect(state.approve).not.toHaveBeenCalled();
    expect(state.reject).toHaveBeenCalledTimes(1);
    expect(doomClear).toHaveBeenCalledWith('tool-call-2-deny');
    expect(persistAlwaysRules).not.toHaveBeenCalled();
    expect(recordDecision).toHaveBeenCalledWith(
      expect.objectContaining({ rulePattern: 'vault:**' }),
      'deny',
      'approval_denied_once'
    );
    expect(hasPendingApprovals(gate)).toBe(false);
  });

  it('action=allow_type 时在规则持久化完成前不应结算审批门', async () => {
    let resolvePersist: (() => void) | null = null;
    const persistAlwaysRules = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePersist = resolve;
        })
    );
    const recordDecision = vi.fn().mockResolvedValue(undefined);
    mockGetPermissionRuntime.mockReturnValue({
      getDecision: vi.fn().mockReturnValue({
        toolName: 'write',
        callId: 'call-2b',
        domain: 'edit',
        targets: ['vault:/docs/a.md'],
        decision: 'ask',
        rulePattern: 'vault:**',
        sessionId: 'session-2b',
        mode: 'ask',
      }),
      persistAlwaysRules,
      recordDecision,
      clearDecision: vi.fn(),
    });
    mockGetDoomLoopRuntime.mockReturnValue({
      approve: vi.fn(),
      clear: vi.fn(),
    });

    const state = { approve: vi.fn() };
    const gate = createApprovalGate({
      channel: 'vault',
      sessionId: 'session-2b',
      state: state as never,
    });
    const approvalId = registerApprovalRequest(gate, {
      toolCallId: 'tool-call-2b',
      item: {} as never,
    });

    const approvePromise = approveToolRequest({ approvalId, action: 'allow_type' });
    await Promise.resolve();

    expect(hasPendingApprovals(gate)).toBe(true);
    expect(persistAlwaysRules).toHaveBeenCalledTimes(1);
    resolvePersist?.();
    await approvePromise;

    expect(recordDecision).toHaveBeenCalledWith(
      expect.objectContaining({ rulePattern: 'vault:**' }),
      'allow'
    );
    expect(hasPendingApprovals(gate)).toBe(false);
  });

  it('审批不存在时返回 already_processed（不抛错）', async () => {
    const result = await approveToolRequest({
      approvalId: 'missing-approval-id',
      action: 'once',
    });

    expect(result).toEqual({
      status: 'already_processed',
      reason: 'missing',
    });
  });

  it('首次 Vault 内 ask 审批返回升级提示（查询阶段不消费）', () => {
    mockGetPermissionRuntime.mockReturnValue({
      getDecision: vi.fn().mockReturnValue({
        toolName: 'write',
        callId: 'call-3',
        domain: 'edit',
        targets: ['vault:/docs/a.md'],
        decision: 'ask',
        rulePattern: 'vault:**',
        sessionId: 'session-3',
        mode: 'ask',
      }),
      persistAlwaysRules: vi.fn(),
      recordDecision: vi.fn(),
      clearDecision: vi.fn(),
    });

    const gate = createApprovalGate({
      channel: 'vault',
      sessionId: 'session-3',
      state: { approve: vi.fn() } as never,
    });
    const approvalId = registerApprovalRequest(gate, {
      toolCallId: 'tool-call-3',
      item: {} as never,
    });

    const first = getApprovalContext({ approvalId });

    expect(first).toEqual({ suggestFullAccessUpgrade: true });
    expect(mockConsumeFullAccessUpgradePromptOnce).not.toHaveBeenCalled();
  });

  it('Vault 外路径审批不会触发升级提示', () => {
    mockGetPermissionRuntime.mockReturnValue({
      getDecision: vi.fn().mockReturnValue({
        toolName: 'read',
        callId: 'call-4',
        domain: 'read',
        targets: ['fs:/external/a.md'],
        decision: 'ask',
        rulePattern: 'external_path_unapproved',
        sessionId: 'session-4',
        mode: 'ask',
      }),
      persistAlwaysRules: vi.fn(),
      recordDecision: vi.fn(),
      clearDecision: vi.fn(),
    });

    const gate = createApprovalGate({
      channel: 'external',
      sessionId: 'session-4',
      state: { approve: vi.fn() } as never,
    });
    const approvalId = registerApprovalRequest(gate, {
      toolCallId: 'tool-call-4',
      item: {} as never,
    });

    const context = getApprovalContext({ approvalId });

    expect(context).toEqual({ suggestFullAccessUpgrade: false });
    expect(mockConsumeFullAccessUpgradePromptOnce).not.toHaveBeenCalled();
  });

  it('首次升级提醒消费接口只在第一次返回 consumed=true', () => {
    mockConsumeFullAccessUpgradePromptOnce.mockReturnValueOnce(true).mockReturnValueOnce(false);

    const first = consumeFullAccessUpgradePromptReminder();
    const second = consumeFullAccessUpgradePromptReminder();

    expect(first).toEqual({ consumed: true });
    expect(second).toEqual({ consumed: false });
    expect(mockConsumeFullAccessUpgradePromptOnce).toHaveBeenCalledTimes(2);
  });

  it('切到 full_access 后自动放行同会话内 Vault ask 审批（外部路径审批除外）', async () => {
    mockGetGlobalPermissionModeSync.mockReturnValue('ask');
    const recordDecision = vi.fn().mockResolvedValue(undefined);
    const getDecision = vi.fn((toolCallId: string) => {
      if (toolCallId === 'tool-call-vault') {
        return {
          toolName: 'write',
          callId: 'call-5',
          domain: 'edit',
          targets: ['vault:/docs/a.md'],
          decision: 'ask',
          rulePattern: 'vault:**',
          sessionId: 'session-5',
          mode: 'ask',
        };
      }
      return {
        toolName: 'read',
        callId: 'call-6',
        domain: 'read',
        targets: ['fs:/external/b.md'],
        decision: 'ask',
        rulePattern: 'external_path_unapproved',
        sessionId: 'session-5',
        mode: 'ask',
      };
    });
    const doomApprove = vi.fn();
    mockGetPermissionRuntime.mockReturnValue({
      getDecision,
      persistAlwaysRules: vi.fn(),
      recordDecision,
      clearDecision: vi.fn(),
    });
    mockGetDoomLoopRuntime.mockReturnValue({
      approve: doomApprove,
      clear: vi.fn(),
    });

    const state = { approve: vi.fn() };
    const gate = createApprovalGate({
      channel: 'session-5-channel',
      sessionId: 'session-5',
      state: state as never,
    });
    registerApprovalRequest(gate, {
      toolCallId: 'tool-call-vault',
      item: { id: 'vault-item' } as never,
    });
    registerApprovalRequest(gate, {
      toolCallId: 'tool-call-external',
      item: { id: 'external-item' } as never,
    });

    mockGetGlobalPermissionModeSync.mockReturnValue('full_access');
    const approved = await autoApprovePendingForSession({ sessionId: 'session-5' });

    expect(approved).toBe(1);
    expect(state.approve).toHaveBeenCalledTimes(1);
    expect(doomApprove).toHaveBeenCalledWith('tool-call-vault', 'once');
    expect(recordDecision).toHaveBeenCalledWith(
      expect.objectContaining({ rulePattern: 'vault:**' }),
      'allow',
      'full_access'
    );
    expect(hasPendingApprovals(gate)).toBe(true);
  });

  it('切到 full_access 后会持续收敛同会话中新产生的 Vault ask 审批', async () => {
    mockGetGlobalPermissionModeSync.mockReturnValue('ask');
    const recordDecision = vi.fn().mockResolvedValue(undefined);
    const getDecision = vi.fn((toolCallId: string) => {
      if (toolCallId === 'tool-call-vault-1') {
        return {
          toolName: 'write',
          callId: 'call-7',
          domain: 'edit',
          targets: ['vault:/docs/a.md'],
          decision: 'ask',
          rulePattern: 'vault:**',
          sessionId: 'session-6',
          mode: 'ask',
        };
      }
      if (toolCallId === 'tool-call-vault-2') {
        return {
          toolName: 'write',
          callId: 'call-8',
          domain: 'edit',
          targets: ['vault:/docs/b.md'],
          decision: 'ask',
          rulePattern: 'vault:**',
          sessionId: 'session-6',
          mode: 'ask',
        };
      }
      return undefined;
    });
    const doomApprove = vi.fn();
    mockGetPermissionRuntime.mockReturnValue({
      getDecision,
      persistAlwaysRules: vi.fn(),
      recordDecision,
      clearDecision: vi.fn(),
    });
    mockGetDoomLoopRuntime.mockReturnValue({
      approve: doomApprove,
      clear: vi.fn(),
    });

    let shouldAppendFollowupApproval = true;
    let gateRef: ReturnType<typeof createApprovalGate> | null = null;
    const state = {
      approve: vi.fn((item: { id?: string }) => {
        if (item?.id !== 'vault-item-1' || !gateRef || !shouldAppendFollowupApproval) {
          return;
        }
        shouldAppendFollowupApproval = false;
        registerApprovalRequest(gateRef, {
          toolCallId: 'tool-call-vault-2',
          item: { id: 'vault-item-2' } as never,
        });
      }),
    };

    const gate = createApprovalGate({
      channel: 'session-6-channel',
      sessionId: 'session-6',
      state: state as never,
    });
    gateRef = gate;
    registerApprovalRequest(gate, {
      toolCallId: 'tool-call-vault-1',
      item: { id: 'vault-item-1' } as never,
    });

    mockGetGlobalPermissionModeSync.mockReturnValue('full_access');
    const approved = await autoApprovePendingForSession({ sessionId: 'session-6' });

    expect(approved).toBeGreaterThanOrEqual(1);
    expect(state.approve).toHaveBeenCalledTimes(2);
    expect(doomApprove).toHaveBeenCalledTimes(2);
    expect(doomApprove.mock.calls).toEqual(
      expect.arrayContaining([
        ['tool-call-vault-1', 'once'],
        ['tool-call-vault-2', 'once'],
      ])
    );
    expect(recordDecision).toHaveBeenCalledTimes(2);
    expect(hasPendingApprovals(gate)).toBe(false);
  });

  it('复用同 channel gate 时会清理旧审批 entry，避免 orphan 上下文残留', () => {
    mockGetPermissionRuntime.mockReturnValue({
      getDecision: vi.fn().mockReturnValue({
        toolName: 'write',
        callId: 'call-reuse',
        domain: 'edit',
        targets: ['vault:/docs/reuse.md'],
        decision: 'ask',
        rulePattern: 'vault:**',
        sessionId: 'session-reuse-1',
        mode: 'ask',
      }),
      persistAlwaysRules: vi.fn(),
      recordDecision: vi.fn(),
      clearDecision: vi.fn(),
    });

    const firstGate = createApprovalGate({
      channel: 'session-reuse-channel',
      sessionId: 'session-reuse-1',
      state: { approve: vi.fn() } as never,
    });
    const staleApprovalId = registerApprovalRequest(firstGate, {
      toolCallId: 'tool-call-reuse',
      item: {} as never,
    });

    createApprovalGate({
      channel: 'session-reuse-channel',
      sessionId: 'session-reuse-2',
      state: { approve: vi.fn() } as never,
    });

    expect(getApprovalContext({ approvalId: staleApprovalId })).toEqual({
      suggestFullAccessUpgrade: false,
    });
  });

  it('full_access 会话中新注册的 Vault ask 审批会即时自动放行', async () => {
    mockGetGlobalPermissionModeSync.mockReturnValue('full_access');
    const recordDecision = vi.fn().mockResolvedValue(undefined);
    const getDecision = vi.fn().mockReturnValue({
      toolName: 'write',
      callId: 'call-9',
      domain: 'edit',
      targets: ['vault:/docs/c.md'],
      decision: 'ask',
      rulePattern: 'vault:**',
      sessionId: 'session-7',
      mode: 'ask',
    });
    const doomApprove = vi.fn();
    mockGetPermissionRuntime.mockReturnValue({
      getDecision,
      persistAlwaysRules: vi.fn(),
      recordDecision,
      clearDecision: vi.fn(),
    });
    mockGetDoomLoopRuntime.mockReturnValue({
      approve: doomApprove,
      clear: vi.fn(),
    });

    const state = { approve: vi.fn() };
    const gate = createApprovalGate({
      channel: 'session-7-channel',
      sessionId: 'session-7',
      state: state as never,
    });
    registerApprovalRequest(gate, {
      toolCallId: 'tool-call-vault-3',
      item: { id: 'vault-item-3' } as never,
    });
    await Promise.resolve();

    expect(state.approve).toHaveBeenCalledTimes(1);
    expect(doomApprove).toHaveBeenCalledWith('tool-call-vault-3', 'once');
    expect(recordDecision).toHaveBeenCalledWith(
      expect.objectContaining({ rulePattern: 'vault:**' }),
      'allow',
      'full_access'
    );
    expect(hasPendingApprovals(gate)).toBe(false);
  });

  it('full_access 会话中新注册且可即时放行的审批不应返回 approvalId（避免渲染过期审批卡）', () => {
    mockGetGlobalPermissionModeSync.mockReturnValue('full_access');
    const recordDecision = vi.fn().mockResolvedValue(undefined);
    const getDecision = vi.fn().mockReturnValue({
      toolName: 'write',
      callId: 'call-9b',
      domain: 'edit',
      targets: ['vault:/docs/c.md'],
      decision: 'ask',
      rulePattern: 'vault:**',
      sessionId: 'session-7',
      mode: 'ask',
    });
    const doomApprove = vi.fn();
    mockGetPermissionRuntime.mockReturnValue({
      getDecision,
      persistAlwaysRules: vi.fn(),
      recordDecision,
      clearDecision: vi.fn(),
    });
    mockGetDoomLoopRuntime.mockReturnValue({
      approve: doomApprove,
      clear: vi.fn(),
    });

    const state = { approve: vi.fn() };
    const gate = createApprovalGate({
      channel: 'session-7-channel',
      sessionId: 'session-7',
      state: state as never,
    });
    const approvalId = registerApprovalRequest(gate, {
      toolCallId: 'tool-call-vault-3b',
      item: { id: 'vault-item-3b' } as never,
    });

    expect(approvalId).toBeNull();
    expect(state.approve).toHaveBeenCalledTimes(1);
    expect(doomApprove).toHaveBeenCalledWith('tool-call-vault-3b', 'once');
    expect(hasPendingApprovals(gate)).toBe(false);
  });

  it('自动放行会跳过 processing 锁中的审批，避免与手动审批并发双触发', async () => {
    mockGetGlobalPermissionModeSync.mockReturnValue('ask');
    let resolveRecordDecision: (() => void) | null = null;
    const recordDecision = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRecordDecision = resolve;
        })
    );
    const getDecision = vi.fn().mockReturnValue({
      toolName: 'write',
      callId: 'call-10',
      domain: 'edit',
      targets: ['vault:/docs/d.md'],
      decision: 'ask',
      rulePattern: 'vault:**',
      sessionId: 'session-8',
      mode: 'ask',
    });
    const doomApprove = vi.fn();
    mockGetPermissionRuntime.mockReturnValue({
      getDecision,
      persistAlwaysRules: vi.fn(),
      recordDecision,
      clearDecision: vi.fn(),
    });
    mockGetDoomLoopRuntime.mockReturnValue({
      approve: doomApprove,
      clear: vi.fn(),
    });

    const state = { approve: vi.fn() };
    const gate = createApprovalGate({
      channel: 'session-8-channel',
      sessionId: 'session-8',
      state: state as never,
    });
    const approvalId = registerApprovalRequest(gate, {
      toolCallId: 'tool-call-vault-4',
      item: { id: 'vault-item-4' } as never,
    });

    const manualApprovePromise = approveToolRequest({ approvalId, action: 'once' });
    await Promise.resolve();
    const duplicatedApproveResult = await approveToolRequest({ approvalId, action: 'once' });
    mockGetGlobalPermissionModeSync.mockReturnValue('full_access');
    const autoApproved = await autoApprovePendingForSession({ sessionId: 'session-8' });

    expect(duplicatedApproveResult).toEqual({
      status: 'already_processed',
      reason: 'processing',
    });
    expect(autoApproved).toBe(0);
    expect(state.approve).toHaveBeenCalledTimes(1);
    expect(doomApprove).toHaveBeenCalledTimes(1);
    expect(hasPendingApprovals(gate)).toBe(true);

    resolveRecordDecision?.();
    await manualApprovePromise;
    expect(hasPendingApprovals(gate)).toBe(false);
  });
});
