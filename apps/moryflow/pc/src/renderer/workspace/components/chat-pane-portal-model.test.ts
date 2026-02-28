import { describe, expect, it } from 'vitest';

import { resolveChatPanePlacement } from './chat-pane-portal-model';

describe('chat-pane-portal-model', () => {
  it('uses main placement for agent/chat', () => {
    expect(
      resolveChatPanePlacement({
        destination: 'agent',
        sidebarMode: 'chat',
      })
    ).toBe('main');
  });

  it('uses panel placement for agent/home', () => {
    expect(
      resolveChatPanePlacement({
        destination: 'agent',
        sidebarMode: 'home',
      })
    ).toBe('panel');
  });

  it('uses parking placement for non-agent destinations', () => {
    expect(
      resolveChatPanePlacement({
        destination: 'sites',
        sidebarMode: 'chat',
      })
    ).toBe('parking');

    expect(
      resolveChatPanePlacement({
        destination: 'skills',
        sidebarMode: 'home',
      })
    ).toBe('parking');
  });
});
