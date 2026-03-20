import { describe, expect, it, vi } from 'vitest';
import {
  createAutomationIpc,
  registerAutomationsIpcHandlers,
  toggleAutomationIpc,
} from './automations-handlers.js';

const createService = () => ({
  listAutomations: vi.fn(() => []),
  getAutomation: vi.fn(() => null),
  createAutomation: vi.fn((job) => job),
  updateAutomation: vi.fn((job) => job),
  deleteAutomation: vi.fn(),
  toggleAutomation: vi.fn((jobId, enabled) => ({ id: jobId, enabled })),
  runAutomationNow: vi.fn(async (jobId) => ({ id: jobId })),
  listRuns: vi.fn(async () => []),
  deleteAutomationContext: vi.fn(),
  createAutomationContext: vi.fn((input) => ({
    id: 'context-1',
    title: input.title ?? 'New automation',
  })),
  getChatSessionSummary: vi.fn((sessionId) => ({
    id: sessionId,
    title: 'Canonical conversation',
    vaultPath: '/vaults/session',
  })),
  ensureApprovedVaultPath: vi.fn((vaultPath) => vaultPath),
  generateAutomationId: vi.fn(() => 'job-1'),
});

describe('automations IPC handlers', () => {
  it('createAutomationIpc ignores renderer vaultPath for conversation-session source', () => {
    const service = createService();

    const result = createAutomationIpc(
      service,
      {
        name: 'Daily summary',
        enabled: true,
        source: {
          kind: 'conversation-session',
          sessionId: 'session-1',
          vaultPath: '/malicious/path',
          displayTitle: 'Conversation automation',
        },
        schedule: {
          kind: 'every',
          intervalMs: 60_000,
        },
        payload: {
          kind: 'agent-turn',
          message: 'Summarize updates',
          contextDepth: 6,
        },
        delivery: {
          mode: 'none',
        },
        executionPolicy: {
          approvalMode: 'unattended',
          toolPolicy: { allow: [{ tool: 'Read' }] },
          networkPolicy: { mode: 'deny' },
          fileSystemPolicy: { mode: 'vault_only' },
          requiresExplicitConfirmation: true,
        },
      },
      1234
    );

    expect(service.getChatSessionSummary).toHaveBeenCalledWith('session-1');
    expect(service.createAutomation).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({
          kind: 'conversation-session',
          sessionId: 'session-1',
          vaultPath: '/vaults/session',
          displayTitle: 'Canonical conversation',
        }),
      })
    );
    expect((result as { id: string }).id).toBe('job-1');
  });

  it('createAutomationIpc 为 automations module source 创建 context 并归一化为 job', () => {
    const service = createService();

    const result = createAutomationIpc(
      service,
      {
        name: 'Daily summary',
        enabled: true,
        source: {
          kind: 'automation-context',
          vaultPath: '/vaults/main',
          displayTitle: 'New automation',
        },
        schedule: {
          kind: 'every',
          intervalMs: 60_000,
        },
        payload: {
          kind: 'agent-turn',
          message: 'Summarize updates',
          contextDepth: 6,
        },
        delivery: {
          mode: 'none',
        },
        executionPolicy: {
          approvalMode: 'unattended',
          toolPolicy: { allow: [{ tool: 'Read' }] },
          networkPolicy: { mode: 'deny' },
          fileSystemPolicy: { mode: 'vault_only' },
          requiresExplicitConfirmation: true,
        },
      },
      1234
    );

    expect(service.ensureApprovedVaultPath).toHaveBeenCalledWith('/vaults/main');
    expect(service.createAutomationContext).toHaveBeenCalledWith({
      vaultPath: '/vaults/main',
      title: 'New automation',
    });
    expect(service.createAutomation).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'job-1',
        createdAt: 1234,
        source: expect.objectContaining({
          kind: 'automation-context',
          contextId: 'context-1',
          origin: 'automations-module',
        }),
      })
    );
    expect((result as { id: string }).id).toBe('job-1');
  });

  it('createAutomationIpc rolls back a created automation context when createAutomation fails', () => {
    const service = createService();
    service.createAutomation.mockImplementation(() => {
      throw new Error('endpoint missing');
    });

    expect(() =>
      createAutomationIpc(service, {
        name: 'Daily summary',
        enabled: true,
        source: {
          kind: 'automation-context',
          vaultPath: '/vaults/main',
          displayTitle: 'New automation',
        },
        schedule: {
          kind: 'every',
          intervalMs: 60_000,
        },
        payload: {
          kind: 'agent-turn',
          message: 'Summarize updates',
          contextDepth: 6,
        },
        delivery: {
          mode: 'push',
          target: {
            channel: 'telegram',
            accountId: 'default',
            chatId: 'chat-1',
            label: 'Telegram chat-1',
          },
        },
        executionPolicy: {
          approvalMode: 'unattended',
          toolPolicy: { allow: [{ tool: 'Read' }] },
          networkPolicy: { mode: 'deny' },
          fileSystemPolicy: { mode: 'vault_only' },
          requiresExplicitConfirmation: true,
        },
      })
    ).toThrow('endpoint missing');

    expect(service.deleteAutomationContext).toHaveBeenCalledWith('context-1');
  });

  it('toggleAutomationIpc 应透传 jobId 和 enabled', () => {
    const service = createService();

    const result = toggleAutomationIpc(service, {
      jobId: 'job-1',
      enabled: false,
    });

    expect(service.toggleAutomation).toHaveBeenCalledWith('job-1', false);
    expect(result).toEqual({ id: 'job-1', enabled: false });
  });

  it('registerAutomationsIpcHandlers 注册完整 channel 集合', () => {
    const service = createService();
    const handle = vi.fn();

    registerAutomationsIpcHandlers({ handle }, service);

    expect(handle).toHaveBeenCalledTimes(8);
    expect(handle).toHaveBeenCalledWith('automations:list', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('automations:get', expect.any(Function));
  });
});
