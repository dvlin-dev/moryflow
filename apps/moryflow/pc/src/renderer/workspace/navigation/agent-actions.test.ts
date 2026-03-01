import { describe, it, expect, vi } from 'vitest';
import type { VaultTreeNode } from '@shared/ipc';
import { createAgentActions } from './agent-actions';

describe('createAgentActions', () => {
  it('openThread: setSidebarMode(chat) then selectThread', () => {
    const goToAgent = vi.fn();
    const setSidebarMode = vi.fn();
    const selectThread = vi.fn();
    const openFile = vi.fn();

    const actions = createAgentActions({ goToAgent, setSidebarMode, selectThread, openFile });
    actions.openThread('t1');

    expect(goToAgent).toHaveBeenCalledTimes(1);
    expect(setSidebarMode).toHaveBeenCalledWith('chat');
    expect(selectThread).toHaveBeenCalledWith('t1');
    expect(openFile).not.toHaveBeenCalled();
  });

  it('openFile: setSidebarMode(home) then openFile', () => {
    const goToAgent = vi.fn();
    const setSidebarMode = vi.fn();
    const selectThread = vi.fn();
    const openFile = vi.fn();

    const actions = createAgentActions({ goToAgent, setSidebarMode, selectThread, openFile });
    const node = { id: '1', name: 'a.md', path: '/a.md' } as unknown as VaultTreeNode;
    actions.openFile(node);

    expect(goToAgent).toHaveBeenCalledTimes(1);
    expect(setSidebarMode).toHaveBeenCalledWith('home');
    expect(openFile).toHaveBeenCalledWith(node);
    expect(selectThread).not.toHaveBeenCalled();
  });
});
