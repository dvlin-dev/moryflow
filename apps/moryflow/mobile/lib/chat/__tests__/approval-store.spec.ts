/* @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetPermissionRuntime, mockGetDoomLoopRuntime } = vi.hoisted(() => ({
  mockGetPermissionRuntime: vi.fn(),
  mockGetDoomLoopRuntime: vi.fn(),
}));

const { mockGenerateUUID } = vi.hoisted(() => ({
  mockGenerateUUID: vi.fn(),
}));

vi.mock('@/lib/agent-runtime/permission-runtime', () => ({
  getPermissionRuntime: mockGetPermissionRuntime,
}));

vi.mock('@/lib/agent-runtime/doom-loop-runtime', () => ({
  getDoomLoopRuntime: mockGetDoomLoopRuntime,
}));

vi.mock('@/lib/utils/uuid', () => ({
  generateUUID: mockGenerateUUID,
}));

import {
  approveToolRequest,
  clearApprovalGate,
  createApprovalGate,
  hasPendingApprovals,
  registerApprovalRequest,
} from '../approval-store';

describe('mobile approval-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateUUID.mockReturnValue('approval-1');
  });

  afterEach(() => {
    clearApprovalGate('chat-1');
    clearApprovalGate('chat-2');
  });

  it('审批成功时返回 approved', async () => {
    const persistAlwaysRules = vi.fn().mockResolvedValue(undefined);
    const recordDecision = vi.fn().mockResolvedValue(undefined);
    mockGetPermissionRuntime.mockReturnValue({
      getDecision: vi.fn().mockReturnValue({
        decision: 'ask',
      }),
      persistAlwaysRules,
      recordDecision,
      clearDecision: vi.fn(),
    });
    const doomApprove = vi.fn();
    mockGetDoomLoopRuntime.mockReturnValue({
      approve: doomApprove,
      clear: vi.fn(),
    });

    const state = { approve: vi.fn() };
    const gate = createApprovalGate({
      chatId: 'chat-1',
      state: state as never,
    });
    const approvalId = registerApprovalRequest(gate, {
      toolCallId: 'tool-call-1',
      item: { id: 'item-1' } as never,
    });

    const result = await approveToolRequest({ approvalId, remember: 'always' });

    expect(result).toEqual({
      status: 'approved',
      remember: 'always',
    });
    expect(state.approve).toHaveBeenCalledTimes(1);
    expect(doomApprove).toHaveBeenCalledWith('tool-call-1', 'always');
    expect(persistAlwaysRules).toHaveBeenCalledTimes(1);
    expect(recordDecision).toHaveBeenCalledTimes(1);
    expect(hasPendingApprovals(gate)).toBe(false);
  });

  it('仅本次允许时不会持久化 always 规则', async () => {
    const persistAlwaysRules = vi.fn().mockResolvedValue(undefined);
    const recordDecision = vi.fn().mockResolvedValue(undefined);
    mockGetPermissionRuntime.mockReturnValue({
      getDecision: vi.fn().mockReturnValue({
        decision: 'ask',
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
      chatId: 'chat-1',
      state: { approve: vi.fn() } as never,
    });
    const approvalId = registerApprovalRequest(gate, {
      toolCallId: 'tool-call-once',
      item: { id: 'item-once' } as never,
    });

    const result = await approveToolRequest({ approvalId, remember: 'once' });

    expect(result).toEqual({
      status: 'approved',
      remember: 'once',
    });
    expect(persistAlwaysRules).not.toHaveBeenCalled();
    expect(recordDecision).toHaveBeenCalledTimes(1);
  });

  it('审批不存在时返回 already_processed:missing', async () => {
    const result = await approveToolRequest({
      approvalId: 'missing-id',
      remember: 'once',
    });

    expect(result).toEqual({
      status: 'already_processed',
      reason: 'missing',
    });
  });

  it('审批处理中时重复点击返回 already_processed:processing', async () => {
    let unblockPersist: () => void = () => {};
    mockGetPermissionRuntime.mockReturnValue({
      getDecision: vi.fn().mockReturnValue({
        decision: 'ask',
      }),
      persistAlwaysRules: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            unblockPersist = resolve;
          })
      ),
      recordDecision: vi.fn().mockResolvedValue(undefined),
      clearDecision: vi.fn(),
    });
    mockGetDoomLoopRuntime.mockReturnValue({
      approve: vi.fn(),
      clear: vi.fn(),
    });

    const gate = createApprovalGate({
      chatId: 'chat-2',
      state: { approve: vi.fn() } as never,
    });
    const approvalId = registerApprovalRequest(gate, {
      toolCallId: 'tool-call-2',
      item: { id: 'item-2' } as never,
    });

    const firstApprovePromise = approveToolRequest({ approvalId, remember: 'always' });
    await Promise.resolve();
    const duplicatedResult = await approveToolRequest({ approvalId, remember: 'once' });

    expect(duplicatedResult).toEqual({
      status: 'already_processed',
      reason: 'processing',
    });

    unblockPersist();
    await firstApprovePromise;
  });
});
