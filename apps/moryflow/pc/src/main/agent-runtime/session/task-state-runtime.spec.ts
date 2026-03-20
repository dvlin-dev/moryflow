/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatSessionSummary } from '../../../shared/ipc.js';

const taskStateRuntimeMocks = vi.hoisted(() => ({
  createDesktopTaskStateService: vi.fn(() => ({ source: 'task-service' })),
  getSummary: vi.fn(),
  setTaskState: vi.fn(),
  broadcastSessionEvent: vi.fn(),
}));

vi.mock('./task-state-service.js', () => ({
  createDesktopTaskStateService: taskStateRuntimeMocks.createDesktopTaskStateService,
}));

vi.mock('../../chat-session-store/index.js', () => ({
  chatSessionStore: {
    getSummary: taskStateRuntimeMocks.getSummary,
    setTaskState: taskStateRuntimeMocks.setTaskState,
  },
}));

vi.mock('../../chat/broadcast.js', () => ({
  broadcastSessionEvent: taskStateRuntimeMocks.broadcastSessionEvent,
}));

import { createRuntimeTaskStateService } from './task-state-runtime.js';

describe('createRuntimeTaskStateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bridges setTaskState persistence into broadcastSessionEvent', () => {
    const service = createRuntimeTaskStateService();

    expect(service).toEqual({ source: 'task-service' });
    expect(taskStateRuntimeMocks.createDesktopTaskStateService).toHaveBeenCalledTimes(1);

    const options = taskStateRuntimeMocks.createDesktopTaskStateService.mock.calls[0]?.[0];
    if (!options) {
      throw new Error('missing task state service options');
    }

    const session: ChatSessionSummary = {
      id: 'session-a',
      title: 'Session A',
      createdAt: 1,
      updatedAt: 2,
      vaultPath: '/vault',
    };

    options.store.getSummary('session-a');
    options.store.setTaskState('session-a', undefined);
    options.emitSessionUpdated(session);

    expect(taskStateRuntimeMocks.getSummary).toHaveBeenCalledWith('session-a');
    expect(taskStateRuntimeMocks.setTaskState).toHaveBeenCalledWith('session-a', undefined);
    expect(taskStateRuntimeMocks.broadcastSessionEvent).toHaveBeenCalledWith({
      type: 'updated',
      session,
    });
  });
});
