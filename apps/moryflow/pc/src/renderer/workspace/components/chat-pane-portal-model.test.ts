import { describe, expect, it } from 'vitest';

import { resolveChatPanePlacement } from './chat-pane-portal-model';

describe('chat-pane-portal-model', () => {
  it('uses main placement for agent/chat', () => {
    expect(
      resolveChatPanePlacement({
        destination: 'agent',
        agentSub: 'chat',
      })
    ).toBe('main');
  });

  it('uses panel placement for agent/workspace', () => {
    expect(
      resolveChatPanePlacement({
        destination: 'agent',
        agentSub: 'workspace',
      })
    ).toBe('panel');
  });

  it('uses parking placement for non-agent destinations', () => {
    expect(
      resolveChatPanePlacement({
        destination: 'sites',
        agentSub: 'chat',
      })
    ).toBe('parking');

    expect(
      resolveChatPanePlacement({
        destination: 'skills',
        agentSub: 'workspace',
      })
    ).toBe('parking');
  });
});
