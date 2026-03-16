/* @vitest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentSettings } from '@shared/ipc';

/* ------------------------------------------------------------------ */
/*  Hoisted mocks — must be declared before vi.mock() calls           */
/* ------------------------------------------------------------------ */

const mocks = vi.hoisted(() => {
  type Listener = (settings: AgentSettings) => void;

  const subscribers = new Set<Listener>();
  return {
    subscribers,
    loadResolve: null as ((settings: AgentSettings) => void) | null,
    subscribe: vi.fn((listener: Listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    }),
    load: vi.fn(
      () =>
        new Promise<AgentSettings>((resolve) => {
          mocks.loadResolve = resolve;
        })
    ),
    getCached: vi.fn(() => null),
    updateSettings: vi.fn(async () => {}),
  };
});

vi.mock('@/lib/agent-settings-resource', () => ({
  agentSettingsResource: {
    subscribe: mocks.subscribe,
    load: mocks.load,
    getCached: mocks.getCached,
  },
}));

vi.mock('@/lib/chat-thinking-overrides', () => ({
  getChatThinkingOverridesSnapshot: () => ({}),
  setChatThinkingOverrideLevel: vi.fn(),
  subscribeChatThinkingOverrides: () => () => {},
}));

vi.mock('../handle', () => ({
  computeAgentOptions: () => ({}),
}));

vi.mock('@/lib/server', () => ({
  isMembershipModelId: (id: string | null | undefined) => !!id && id.startsWith('mf:'),
}));

const FAKE_THINKING: import('@moryflow/model-bank/registry').ModelThinkingProfile = {
  supportsThinking: false,
  defaultLevel: 'off',
  levels: [{ id: 'off', label: 'Off' }],
};

vi.mock('../models', () => ({
  buildModelGroupsFromSettings: (settings: AgentSettings) => {
    // Derive model groups from settings.providers so each test can control the list.
    const groups: import('../models').ModelGroup[] = [];
    for (const provider of settings.providers) {
      groups.push({
        label: provider.providerId,
        providerSlug: provider.providerId,
        options: provider.models
          .filter((m) => m.enabled)
          .map((m) => ({
            id: `${provider.providerId}/${m.id}`,
            name: m.id,
            provider: provider.providerId,
            providers: [provider.providerId],
            thinkingProfile: FAKE_THINKING,
          })),
      });
    }
    return groups;
  },
}));

vi.mock('@moryflow/model-bank/registry', () => ({
  buildProviderModelRef: (provider: string, model: string) => `${provider}/${model}`,
}));

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const MODEL_STORAGE_KEY = 'moryflow.chat.preferredModel';

const buildSettings = (overrides?: {
  defaultModel?: string | null;
  models?: string[];
  providerId?: string;
}): AgentSettings => {
  const providerId = overrides?.providerId ?? 'openrouter';
  const models = (overrides?.models ?? ['gemini-flash', 'gpt-4o']).map((id) => ({
    id,
    enabled: true,
  }));

  return {
    model: { defaultModel: overrides?.defaultModel ?? null },
    personalization: { customInstructions: '' },
    mcp: { stdio: [], streamableHttp: [] },
    providers: [
      { providerId, enabled: true, apiKey: null, baseUrl: null, models, defaultModelId: null },
    ],
    customProviders: [],
    ui: { theme: 'system' },
  } as unknown as AgentSettings;
};

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

// Dynamic import so vi.mock() is applied first
const importHook = async () => {
  const mod = await import('./use-chat-model-selection');
  return mod.useChatModelSelection;
};

describe('useChatModelSelection — model persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.subscribers.clear();
    mocks.loadResolve = null;
    mocks.subscribe.mockClear();
    mocks.load.mockClear();
    mocks.updateSettings.mockClear();
    // Re-create the load promise for each test
    mocks.load.mockImplementation(
      () =>
        new Promise<AgentSettings>((resolve) => {
          mocks.loadResolve = resolve;
        })
    );
    window.desktopAPI = {
      agent: {
        getSettings: vi.fn(),
        updateSettings: mocks.updateSettings,
        onSettingsChange: vi.fn(() => () => {}),
      },
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores model from electron-store even when localStorage is empty', async () => {
    // localStorage: empty (simulates app restart where localStorage was cleared)
    // electron-store: defaultModel = 'openrouter/gpt-4o'
    const useChatModelSelection = await importHook();
    const { result } = renderHook(() => useChatModelSelection());

    // Initially empty (from localStorage)
    expect(result.current.selectedModelId).toBe('');

    // Simulate settings arriving from electron-store
    const settings = buildSettings({ defaultModel: 'openrouter/gpt-4o' });
    act(() => {
      for (const listener of mocks.subscribers) {
        listener(settings);
      }
    });

    // Should restore to electron-store value
    expect(result.current.selectedModelId).toBe('openrouter/gpt-4o');
  });

  it('trusts localStorage over stale cached settings on pane remount', async () => {
    // localStorage: 'openrouter/gpt-4o' (user just selected in this session)
    // electron-store cache: defaultModel = 'openrouter/gemini-flash' (stale, IPC not yet round-tripped)
    window.localStorage.setItem(MODEL_STORAGE_KEY, 'openrouter/gpt-4o');

    const useChatModelSelection = await importHook();
    const { result } = renderHook(() => useChatModelSelection());

    // Initially from localStorage
    expect(result.current.selectedModelId).toBe('openrouter/gpt-4o');

    // Stale cached settings arrive with a DIFFERENT default
    const settings = buildSettings({ defaultModel: 'openrouter/gemini-flash' });
    act(() => {
      for (const listener of mocks.subscribers) {
        listener(settings);
      }
    });

    // Should keep localStorage value — it's more recent than the stale cache
    expect(result.current.selectedModelId).toBe('openrouter/gpt-4o');
  });

  it('preserves user selection when settings update during session', async () => {
    const useChatModelSelection = await importHook();
    const { result } = renderHook(() => useChatModelSelection());

    // Initial settings load
    const settings = buildSettings({ defaultModel: 'openrouter/gemini-flash' });
    act(() => {
      for (const listener of mocks.subscribers) {
        listener(settings);
      }
    });

    expect(result.current.selectedModelId).toBe('openrouter/gemini-flash');

    // User switches to gpt-4o during the session
    act(() => {
      result.current.setSelectedModelId('openrouter/gpt-4o');
    });

    expect(result.current.selectedModelId).toBe('openrouter/gpt-4o');

    // Settings broadcast again (e.g., provider config changed) — still has old defaultModel
    const updatedSettings = buildSettings({ defaultModel: 'openrouter/gemini-flash' });
    act(() => {
      for (const listener of mocks.subscribers) {
        listener(updatedSettings);
      }
    });

    // Should keep user's selection, NOT revert to electron-store
    expect(result.current.selectedModelId).toBe('openrouter/gpt-4o');
  });

  it('persists selection to electron-store when user picks a model', async () => {
    const useChatModelSelection = await importHook();
    const { result } = renderHook(() => useChatModelSelection());

    // Initial load
    const settings = buildSettings({ defaultModel: 'openrouter/gemini-flash' });
    act(() => {
      for (const listener of mocks.subscribers) {
        listener(settings);
      }
    });

    // User picks a new model
    act(() => {
      result.current.setSelectedModelId('openrouter/gpt-4o');
    });

    // Should persist to electron-store via IPC
    expect(mocks.updateSettings).toHaveBeenCalledWith({
      model: { defaultModel: 'openrouter/gpt-4o' },
    });

    // Should also persist to localStorage
    expect(window.localStorage.getItem(MODEL_STORAGE_KEY)).toBe('openrouter/gpt-4o');
  });

  it('falls back to first available model when electron-store default is null', async () => {
    const useChatModelSelection = await importHook();
    const { result } = renderHook(() => useChatModelSelection());

    // Settings with no default model
    const settings = buildSettings({ defaultModel: null });
    act(() => {
      for (const listener of mocks.subscribers) {
        listener(settings);
      }
    });

    // Should fall back to first available model
    expect(result.current.selectedModelId).toBe('openrouter/gemini-flash');
  });

  it('keeps membership model even when membership data has not loaded yet', async () => {
    // Simulates: user saved a membership model, app restarts, applySettings fires
    // before fetchMembershipModels() completes — the model isn't in groups yet,
    // but we recognize it by its prefix and keep it instead of falling back.
    window.localStorage.setItem(MODEL_STORAGE_KEY, 'mf:gpt-4o');

    const useChatModelSelection = await importHook();
    const { result } = renderHook(() => useChatModelSelection());

    expect(result.current.selectedModelId).toBe('mf:gpt-4o');

    // Settings arrive — only provider models in groups, no membership models yet
    const settings = buildSettings({ defaultModel: 'mf:gpt-4o' });
    act(() => {
      for (const listener of mocks.subscribers) {
        listener(settings);
      }
    });

    // Should keep the membership model, NOT fall back to a provider model
    expect(result.current.selectedModelId).toBe('mf:gpt-4o');
  });
});
