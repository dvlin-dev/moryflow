import { describe, it, expect } from 'vitest';
import {
  DEFAULT_NAVIGATION_STATE,
  ensureAgent,
  getDestination,
  getSidebarMode,
  go,
  normalizeNoVaultNavigation,
  normalizeNoVaultNavigationView,
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
    const state = { kind: 'module', module: 'sites' } as const;
    expect(state).toEqual({ kind: 'module', module: 'sites' });

    expect(ensureAgent(state)).toEqual({ kind: 'agent-workspace', sidebarMode: 'home' });
    expect(ensureAgent(state, 'chat')).toEqual({ kind: 'agent-workspace', sidebarMode: 'chat' });
  });

  it('setSidebarMode: always switches back to agent', () => {
    const state = { kind: 'module', module: 'sites' } as const;
    expect(setSidebarMode(state, 'chat')).toEqual({ kind: 'agent-workspace', sidebarMode: 'chat' });
    expect(setSidebarMode(state, 'home')).toEqual({ kind: 'agent-workspace', sidebarMode: 'home' });
  });

  it('go: maps to module/agent-workspace by destination', () => {
    const state = { kind: 'agent-workspace', sidebarMode: 'home' } as const;
    expect(go(state, 'sites')).toEqual({ kind: 'module', module: 'sites' });
    expect(go({ kind: 'agent-workspace', sidebarMode: 'chat' }, 'remote-agents')).toEqual({
      kind: 'module',
      module: 'remote-agents',
    });
    expect(go({ kind: 'agent-workspace', sidebarMode: 'chat' }, 'skills')).toEqual({
      kind: 'module',
      module: 'skills',
    });

    expect(go({ kind: 'agent-workspace', sidebarMode: 'chat' }, 'agent')).toEqual({
      kind: 'agent-workspace',
      sidebarMode: 'chat',
    });
  });

  it('normalizeNoVaultNavigation: keeps remote-agents and resets others to agent+home', () => {
    expect(normalizeNoVaultNavigation({ kind: 'module', module: 'remote-agents' })).toEqual({
      kind: 'module',
      module: 'remote-agents',
    });

    expect(normalizeNoVaultNavigation({ kind: 'module', module: 'skills' })).toEqual({
      kind: 'agent-workspace',
      sidebarMode: 'home',
    });

    expect(normalizeNoVaultNavigation({ kind: 'module', module: 'sites' })).toEqual({
      kind: 'agent-workspace',
      sidebarMode: 'home',
    });

    expect(normalizeNoVaultNavigation({ kind: 'agent-workspace', sidebarMode: 'chat' })).toEqual({
      kind: 'agent-workspace',
      sidebarMode: 'home',
    });
  });

  it('maps navigation state to destination/sidebar semantics', () => {
    expect(getDestination({ kind: 'agent-workspace', sidebarMode: 'chat' })).toBe('agent');
    expect(getSidebarMode({ kind: 'module', module: 'skills' })).toBe('home');
    expect(getDestination({ kind: 'module', module: 'remote-agents' })).toBe('remote-agents');
  });

  it('normalizes no-vault navigation directly at view level', () => {
    expect(
      normalizeNoVaultNavigationView({
        destination: 'sites',
        sidebarMode: 'chat',
      })
    ).toEqual({ destination: 'agent', sidebarMode: 'home' });

    expect(
      normalizeNoVaultNavigationView({
        destination: 'remote-agents',
        sidebarMode: 'home',
      })
    ).toEqual({ destination: 'remote-agents', sidebarMode: 'home' });
  });
});
