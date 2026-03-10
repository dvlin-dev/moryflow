import { describe, it, expect, vi } from 'vitest';
import type { VaultTreeNode } from '@shared/ipc';
import { createAgentActions } from './agent-actions';

describe('createAgentActions', () => {
  it('openThread: clears home canvas before selecting thread in chat mode', () => {
    const goToAgent = vi.fn();
    const setSidebarMode = vi.fn();
    const selectThread = vi.fn();
    const openFile = vi.fn();
    const clearHomeCanvas = vi.fn();

    const actions = createAgentActions({
      goToAgent,
      setSidebarMode,
      selectThread,
      openFile,
      clearHomeCanvas,
    });
    actions.openThread('t1');

    expect(goToAgent).toHaveBeenCalledTimes(1);
    expect(clearHomeCanvas).toHaveBeenCalledTimes(1);
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

  it('openNewThread: returns module pages to agent home and opens prethread', () => {
    const goToAgent = vi.fn();
    const setSidebarMode = vi.fn();
    const selectThread = vi.fn();
    const openFile = vi.fn();
    const openPreThread = vi.fn();
    const requestHomeCanvas = vi.fn();
    const clearHomeCanvas = vi.fn();

    const actions = createAgentActions({
      goToAgent,
      setSidebarMode,
      selectThread,
      openFile,
      openPreThread,
      requestHomeCanvas,
      clearHomeCanvas,
    });

    actions.openNewThread({
      destination: 'skills',
      sidebarMode: 'home',
      activePath: '/vault/note.md',
    });

    expect(goToAgent).toHaveBeenCalledTimes(1);
    expect(setSidebarMode).toHaveBeenCalledWith('home');
    expect(requestHomeCanvas).toHaveBeenCalledWith('/vault/note.md');
    expect(openPreThread).toHaveBeenCalledTimes(1);
    expect(clearHomeCanvas).not.toHaveBeenCalled();
  });

  it('openNewThread: keeps chat tab and clears stale home canvas when already in agent chat', () => {
    const goToAgent = vi.fn();
    const setSidebarMode = vi.fn();
    const selectThread = vi.fn();
    const openFile = vi.fn();
    const openPreThread = vi.fn();
    const requestHomeCanvas = vi.fn();
    const clearHomeCanvas = vi.fn();

    const actions = createAgentActions({
      goToAgent,
      setSidebarMode,
      selectThread,
      openFile,
      openPreThread,
      requestHomeCanvas,
      clearHomeCanvas,
    });

    actions.openNewThread({
      destination: 'agent',
      sidebarMode: 'chat',
      activePath: '/vault/note.md',
    });

    expect(goToAgent).not.toHaveBeenCalled();
    expect(setSidebarMode).not.toHaveBeenCalled();
    expect(requestHomeCanvas).not.toHaveBeenCalled();
    expect(clearHomeCanvas).toHaveBeenCalledTimes(1);
    expect(openPreThread).toHaveBeenCalledTimes(1);
  });
});
