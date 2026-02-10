import { describe, it, expect, vi } from 'vitest';
import type { VaultTreeNode } from '@shared/ipc';
import { createAgentActions } from './agent-actions';

describe('createAgentActions', () => {
  it('openThread: setSub(chat) then selectThread', () => {
    const setSub = vi.fn();
    const selectThread = vi.fn();
    const openFile = vi.fn();

    const actions = createAgentActions({ setSub, selectThread, openFile });
    actions.openThread('t1');

    expect(setSub).toHaveBeenCalledWith('chat');
    expect(selectThread).toHaveBeenCalledWith('t1');
    expect(openFile).not.toHaveBeenCalled();
  });

  it('openFile: setSub(workspace) then openFile', () => {
    const setSub = vi.fn();
    const selectThread = vi.fn();
    const openFile = vi.fn();

    const actions = createAgentActions({ setSub, selectThread, openFile });
    const node = { id: '1', name: 'a.md', path: '/a.md' } as unknown as VaultTreeNode;
    actions.openFile(node);

    expect(setSub).toHaveBeenCalledWith('workspace');
    expect(openFile).toHaveBeenCalledWith(node);
    expect(selectThread).not.toHaveBeenCalled();
  });
});
