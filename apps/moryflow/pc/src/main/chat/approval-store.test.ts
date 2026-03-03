/* @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetPermissionRuntime, mockGetDoomLoopRuntime, mockAuthorizeExternalPath } = vi.hoisted(
  () => ({
    mockGetPermissionRuntime: vi.fn(),
    mockGetDoomLoopRuntime: vi.fn(),
    mockAuthorizeExternalPath: vi.fn(),
  })
);

vi.mock('../agent-runtime/permission-runtime', () => ({
  getPermissionRuntime: mockGetPermissionRuntime,
}));

vi.mock('../agent-runtime/doom-loop-runtime', () => ({
  getDoomLoopRuntime: mockGetDoomLoopRuntime,
}));

vi.mock('../sandbox/index.js', () => ({
  authorizeExternalPath: mockAuthorizeExternalPath,
}));

import {
  approveToolRequest,
  clearApprovalGate,
  createApprovalGate,
  hasPendingApprovals,
  registerApprovalRequest,
} from './approval-store.js';

describe('approval-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearApprovalGate('external');
    clearApprovalGate('vault');
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
    const gate = createApprovalGate({ channel: 'external', state: state as never });
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
    const gate = createApprovalGate({ channel: 'vault', state: state as never });
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
});
