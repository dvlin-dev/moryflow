import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetPermissionRuntime, mockGetDoomLoopRuntime, mockGenerateUUID, resetUuidCounter } =
  vi.hoisted(() => {
    let uuidCounter = 0;
    return {
      mockGetPermissionRuntime: vi.fn(),
      mockGetDoomLoopRuntime: vi.fn(),
      mockGenerateUUID: vi.fn(() => {
        uuidCounter += 1;
        return `approval-${uuidCounter}`;
      }),
      resetUuidCounter: () => {
        uuidCounter = 0;
      },
    };
  });

vi.mock('@/lib/utils/uuid', () => ({
  generateUUID: mockGenerateUUID,
}));

vi.mock('@/lib/agent-runtime/permission-runtime', () => ({
  getPermissionRuntime: mockGetPermissionRuntime,
}));

vi.mock('@/lib/agent-runtime/doom-loop-runtime', () => ({
  getDoomLoopRuntime: mockGetDoomLoopRuntime,
}));

import {
  approveToolRequest,
  clearApprovalGate,
  createApprovalGate,
  registerApprovalRequest,
} from '../approval-store';

describe('mobile approval-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetUuidCounter();
    mockGenerateUUID.mockClear();
  });

  afterEach(() => {
    clearApprovalGate('chat-1');
    clearApprovalGate('chat-processing');
  });

  it('returns approved for normal approvals', async () => {
    const persistAlwaysRules = vi.fn().mockResolvedValue(undefined);
    const recordDecision = vi.fn().mockResolvedValue(undefined);
    const approve = vi.fn();
    const doomApprove = vi.fn();

    mockGetPermissionRuntime.mockReturnValue({
      getDecision: vi.fn().mockReturnValue({
        decision: 'ask',
        rulePattern: 'vault:**',
      }),
      persistAlwaysRules,
      recordDecision,
      clearDecision: vi.fn(),
    });
    mockGetDoomLoopRuntime.mockReturnValue({
      approve: doomApprove,
      clear: vi.fn(),
    });

    const gate = createApprovalGate({
      chatId: 'chat-1',
      state: { approve } as never,
    });
    const approvalId = registerApprovalRequest(gate, {
      toolCallId: 'tool-call-1',
      item: {} as never,
    });

    const result = await approveToolRequest({ approvalId, remember: 'always' });

    expect(result).toEqual({
      status: 'approved',
      remember: 'always',
    });
    expect(approve).toHaveBeenCalledTimes(1);
    expect(doomApprove).toHaveBeenCalledWith('tool-call-1', 'always');
    expect(persistAlwaysRules).toHaveBeenCalledTimes(1);
    expect(recordDecision).toHaveBeenCalledTimes(1);
  });

  it('returns already_processed when approval id is missing', async () => {
    const result = await approveToolRequest({
      approvalId: 'missing-id',
      remember: 'once',
    });

    expect(result).toEqual({
      status: 'already_processed',
      reason: 'missing',
    });
  });

  it('returns already_processed when approval is processing', async () => {
    let resolvePersistPromise!: () => void;
    const persistPromise = new Promise<void>((resolve) => {
      resolvePersistPromise = resolve;
    });
    const approve = vi.fn();
    mockGetPermissionRuntime.mockReturnValue({
      getDecision: vi.fn().mockReturnValue({
        decision: 'ask',
        rulePattern: 'vault:**',
      }),
      persistAlwaysRules: vi.fn(() => persistPromise),
      recordDecision: vi.fn().mockResolvedValue(undefined),
      clearDecision: vi.fn(),
    });
    mockGetDoomLoopRuntime.mockReturnValue({
      approve: vi.fn(),
      clear: vi.fn(),
    });

    const gate = createApprovalGate({
      chatId: 'chat-processing',
      state: { approve } as never,
    });
    const approvalId = registerApprovalRequest(gate, {
      toolCallId: 'tool-call-processing',
      item: {} as never,
    });

    const firstApprove = approveToolRequest({ approvalId, remember: 'always' });
    await Promise.resolve();
    const secondResult = await approveToolRequest({ approvalId, remember: 'always' });

    expect(secondResult).toEqual({
      status: 'already_processed',
      reason: 'processing',
    });
    resolvePersistPromise();
    await expect(firstApprove).resolves.toEqual({
      status: 'approved',
      remember: 'always',
    });
  });
});
