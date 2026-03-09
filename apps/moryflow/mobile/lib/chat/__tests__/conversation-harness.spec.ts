/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TaskState } from '@moryflow/agents-runtime';

const { mockGetPermissionRuntime, mockGetDoomLoopRuntime } = vi.hoisted(() => ({
  mockGetPermissionRuntime: vi.fn(),
  mockGetDoomLoopRuntime: vi.fn(),
}));

vi.mock('@/lib/agent-runtime/permission-runtime', () => ({
  getPermissionRuntime: mockGetPermissionRuntime,
}));

vi.mock('@/lib/agent-runtime/doom-loop-runtime', () => ({
  getDoomLoopRuntime: mockGetDoomLoopRuntime,
}));

vi.mock('@/lib/utils/uuid', () => ({
  generateUUID: () => 'conversation-harness-approval',
}));

import { buildTaskSheetRows } from '../../../components/chat/tasks-sheet-model';
import {
  approveToolRequest,
  clearApprovalGate,
  createApprovalGate,
  hasPendingApprovals,
  registerApprovalRequest,
} from '../approval-store';

describe('mobile conversation harness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('approval request 恢复后不残留挂起项', async () => {
    mockGetPermissionRuntime.mockReturnValue({
      getDecision: vi.fn().mockReturnValue({ decision: 'ask' }),
      persistAlwaysRules: vi.fn().mockResolvedValue(undefined),
      recordDecision: vi.fn().mockResolvedValue(undefined),
      clearDecision: vi.fn(),
    });
    mockGetDoomLoopRuntime.mockReturnValue({
      approve: vi.fn(),
      clear: vi.fn(),
    });

    const gate = createApprovalGate({
      chatId: 'conversation-harness',
      state: { approve: vi.fn() } as never,
    });

    const approvalId = registerApprovalRequest(gate, {
      toolCallId: 'tool-call-1',
      item: { id: 'approval-item-1' } as never,
    });

    expect(hasPendingApprovals(gate)).toBe(true);

    const result = await approveToolRequest({ approvalId, remember: 'once' });

    expect(result).toEqual({
      status: 'approved',
      remember: 'once',
    });
    expect(hasPendingApprovals(gate)).toBe(false);

    clearApprovalGate('conversation-harness');
  });

  it('task snapshot 只从 session summary 投影', () => {
    const taskState: TaskState = {
      items: [
        {
          id: 'task-1',
          title: 'Plan',
          status: 'in_progress',
          note: 'focused',
        },
      ],
      updatedAt: 100,
    };

    expect(buildTaskSheetRows(taskState)).toEqual([
      {
        id: 'task-1',
        title: 'Plan',
        status: 'in_progress',
        note: 'focused',
      },
    ]);
  });
});
