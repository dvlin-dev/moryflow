import { describe, expect, it } from 'vitest';

import { resolveHomeMainSurface, resolveMainViewState } from './workspace-shell-main-content';

describe('WorkspaceShellMainContent', () => {
  it('keeps home and chat layouts as placement-only changes for agent workspace', () => {
    expect(resolveMainViewState('agent', 'home')).toBe('agent-home');
    expect(resolveMainViewState('agent', 'chat')).toBe('agent-chat');
  });

  it('shows the home entry canvas only when home is empty or explicitly requested', () => {
    expect(resolveHomeMainSurface('agent', 'home', 'empty', false)).toBe('entry-canvas');
    expect(resolveHomeMainSurface('agent', 'home', 'editor', true)).toBe('entry-canvas');
    expect(resolveHomeMainSurface('agent', 'home', 'editor', false)).toBe('editor-split');
    expect(resolveHomeMainSurface('agent', 'chat', 'empty', true)).toBe('default');
  });
});
