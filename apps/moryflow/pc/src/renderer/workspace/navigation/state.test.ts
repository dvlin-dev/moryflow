import { describe, it, expect } from 'vitest';
import { DEFAULT_NAVIGATION_STATE, ensureAgent, go, normalizeAgentSub } from './state';

describe('navigation/state', () => {
  it('normalizeAgentSub: falls back to chat on invalid values', () => {
    expect(normalizeAgentSub(undefined)).toBe('chat');
    expect(normalizeAgentSub(null)).toBe('chat');
    expect(normalizeAgentSub('')).toBe('chat');
    expect(normalizeAgentSub('sites')).toBe('chat');
  });

  it('normalizeAgentSub: keeps valid values', () => {
    expect(normalizeAgentSub('chat')).toBe('chat');
    expect(normalizeAgentSub('workspace')).toBe('workspace');
  });

  it('ensureAgent: forces destination=agent and keeps agentSub by default', () => {
    const state = go({ ...DEFAULT_NAVIGATION_STATE, agentSub: 'workspace' }, 'sites');
    expect(state).toEqual({ destination: 'sites', agentSub: 'workspace' });

    expect(ensureAgent(state)).toEqual({ destination: 'agent', agentSub: 'workspace' });
    expect(ensureAgent(state, 'chat')).toEqual({ destination: 'agent', agentSub: 'chat' });
  });

  it('go: updates destination and preserves agentSub', () => {
    const state = { destination: 'agent', agentSub: 'workspace' } as const;
    expect(go(state, 'sites')).toEqual({ destination: 'sites', agentSub: 'workspace' });
  });
});
