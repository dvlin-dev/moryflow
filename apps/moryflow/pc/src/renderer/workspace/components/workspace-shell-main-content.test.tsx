import { describe, expect, it } from 'vitest';

import {
  resolveHomeMainSurface,
  resolveMainViewState,
  shouldRenderChatPanePortal,
} from './workspace-shell-main-content';

describe('WorkspaceShellMainContent', () => {
  it('keeps home and chat layouts as placement-only changes for agent workspace', () => {
    expect(resolveMainViewState('agent', 'home')).toBe('agent-home');
    expect(resolveMainViewState('agent', 'chat')).toBe('agent-chat');
    expect(resolveMainViewState('memory', 'home')).toBe('memory');
  });

  it('shows the home entry canvas only when home is empty or explicitly requested', () => {
    expect(resolveHomeMainSurface('agent', 'home', 'empty', null, null)).toBe('entry-canvas');
    expect(
      resolveHomeMainSurface(
        'agent',
        'home',
        'editor',
        { activePathAtRequest: '/vault/a.md' },
        '/vault/a.md'
      )
    ).toBe('entry-canvas');
    expect(
      resolveHomeMainSurface(
        'agent',
        'home',
        'editor',
        { activePathAtRequest: '/vault/a.md' },
        '/vault/b.md'
      )
    ).toBe('editor-split');
    expect(resolveHomeMainSurface('agent', 'home', 'editor', null, '/vault/a.md')).toBe(
      'editor-split'
    );
    expect(
      resolveHomeMainSurface('agent', 'chat', 'empty', { activePathAtRequest: null }, null)
    ).toBe('default');
  });

  it('unmounts ChatPanePortal while home entry canvas is visible', () => {
    expect(shouldRenderChatPanePortal('entry-canvas')).toBe(false);
    expect(shouldRenderChatPanePortal('editor-split')).toBe(true);
    expect(shouldRenderChatPanePortal('default')).toBe(true);
  });
});
