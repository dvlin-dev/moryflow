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
  });

  afterEach(() => {
    clearApprovalGate('external');
    clearApprovalGate('vault');
    clearApprovalGate('session-5-channel');
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

    await approveToolRequest({ approvalId, remember: 'once' });

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

  it('普通 ask + remember=always 仍走 permission rules 持久化', async () => {
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

    await approveToolRequest({ approvalId, remember: 'always' });

    expect(mockAuthorizeExternalPath).not.toHaveBeenCalled();
    expect(state.approve).toHaveBeenCalledTimes(1);
    expect(persistAlwaysRules).toHaveBeenCalledTimes(1);
    expect(recordDecision).toHaveBeenCalledWith(
      expect.objectContaining({ rulePattern: 'vault:**' }),
      'allow'
    );
    expect(hasPendingApprovals(gate)).toBe(false);
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
});
