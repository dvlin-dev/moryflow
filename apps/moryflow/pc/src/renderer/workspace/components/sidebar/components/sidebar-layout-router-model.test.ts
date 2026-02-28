import { describe, expect, it } from 'vitest';
import { resolveSidebarContentMode } from './sidebar-layout-router-model';

describe('sidebar-layout-router-model', () => {
  it('keeps sidebar mode only when destination is agent', () => {
    expect(resolveSidebarContentMode('agent', 'chat')).toBe('chat');
    expect(resolveSidebarContentMode('agent', 'home')).toBe('home');
  });

  it('forces home for non-agent destinations', () => {
    expect(resolveSidebarContentMode('skills', 'chat')).toBe('home');
    expect(resolveSidebarContentMode('sites', 'chat')).toBe('home');
    expect(resolveSidebarContentMode('skills', 'home')).toBe('home');
  });
});
