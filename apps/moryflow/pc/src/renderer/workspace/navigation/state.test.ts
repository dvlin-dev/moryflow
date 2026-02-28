import { describe, it, expect } from 'vitest';
import {
  DEFAULT_NAVIGATION_STATE,
  ensureAgent,
  go,
  normalizeSidebarMode,
  setSidebarMode,
} from './state';

describe('navigation/state', () => {
  it('normalizeSidebarMode: falls back to chat on invalid values', () => {
    expect(normalizeSidebarMode(undefined)).toBe('chat');
    expect(normalizeSidebarMode(null)).toBe('chat');
    expect(normalizeSidebarMode('')).toBe('chat');
    expect(normalizeSidebarMode('sites')).toBe('chat');
  });

  it('normalizeSidebarMode: keeps valid values', () => {
    expect(normalizeSidebarMode('chat')).toBe('chat');
    expect(normalizeSidebarMode('home')).toBe('home');
  });

  it('ensureAgent: forces destination=agent and keeps sidebarMode by default', () => {
    const state = {
      ...DEFAULT_NAVIGATION_STATE,
      destination: 'sites',
      sidebarMode: 'chat',
    } as const;
    expect(state).toEqual({ destination: 'sites', sidebarMode: 'chat' });

    expect(ensureAgent(state)).toEqual({ destination: 'agent', sidebarMode: 'chat' });
    expect(ensureAgent(state, 'chat')).toEqual({ destination: 'agent', sidebarMode: 'chat' });
  });

  it('setSidebarMode: always switches back to agent', () => {
    const state = { destination: 'sites', sidebarMode: 'home' } as const;
    expect(setSidebarMode(state, 'chat')).toEqual({ destination: 'agent', sidebarMode: 'chat' });
    expect(setSidebarMode(state, 'home')).toEqual({ destination: 'agent', sidebarMode: 'home' });
  });

  it('go: non-agent destination always falls back to home sidebar', () => {
    const state = { destination: 'agent', sidebarMode: 'home' } as const;
    expect(go(state, 'sites')).toEqual({ destination: 'sites', sidebarMode: 'home' });
    expect(go({ destination: 'agent', sidebarMode: 'chat' }, 'skills')).toEqual({
      destination: 'skills',
      sidebarMode: 'home',
    });

    expect(go({ destination: 'agent', sidebarMode: 'chat' }, 'agent')).toEqual({
      destination: 'agent',
      sidebarMode: 'chat',
    });
  });
});
