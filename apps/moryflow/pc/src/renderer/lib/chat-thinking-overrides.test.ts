import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadModule = async () => import('./chat-thinking-overrides');

describe('chat-thinking-overrides', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('returns snapshot copies to avoid external mutation of internal state', async () => {
    const mod = await loadModule();
    mod.setChatThinkingOverrideLevel('openai/gpt-5.2', 'medium');

    const snapshot = mod.getChatThinkingOverridesSnapshot();
    snapshot['openai/gpt-5.2'] = 'low';

    expect(mod.getChatThinkingOverridesSnapshot()['openai/gpt-5.2']).toBe('medium');
  });

  it('notifies listeners with copies so listener mutation does not leak', async () => {
    const mod = await loadModule();
    let listenerSnapshot: Record<string, string> | null = null;

    const unsubscribe = mod.subscribeChatThinkingOverrides((next) => {
      listenerSnapshot = next;
      next['anthropic/claude-sonnet-4.5'] = 'low';
    });
    mod.setChatThinkingOverrideLevel('anthropic/claude-sonnet-4.5', 'high');
    unsubscribe();

    expect(listenerSnapshot?.['anthropic/claude-sonnet-4.5']).toBe('low');
    expect(mod.getChatThinkingOverridesSnapshot()['anthropic/claude-sonnet-4.5']).toBe('high');
  });
});
