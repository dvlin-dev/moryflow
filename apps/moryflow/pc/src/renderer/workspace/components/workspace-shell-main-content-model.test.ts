import { describe, expect, it } from 'vitest';
import { resolveMainViewState } from './workspace-shell-main-content';

describe('workspace-shell-main-content model', () => {
  it('resolves agent-module destination to dedicated main view', () => {
    expect(resolveMainViewState('agent-module', 'chat')).toBe('agent-module');
    expect(resolveMainViewState('agent-module', 'home')).toBe('agent-module');
  });
});
