import { describe, expect, it, vi, afterEach } from 'vitest';
import type { AgentSettings } from '@shared/ipc';
import { agentSettingsResource } from './agent-settings-resource';

const createSettings = (overrides?: Partial<AgentSettings>): AgentSettings => {
  return {
    model: { defaultModel: null },
    systemPrompt: { mode: 'default', template: '' },
    modelParams: {
      temperature: { mode: 'default', value: 1 },
      topP: { mode: 'default', value: 1 },
      maxTokens: { mode: 'default', value: 1024 },
    },
    mcp: { stdio: [], streamableHttp: [] },
    providers: [],
    customProviders: [],
    ui: { theme: 'system' },
    ...overrides,
  };
};

afterEach(() => {
  agentSettingsResource.__unsafeResetForTests();
  // @ts-expect-error - test cleanup
  window.desktopAPI = undefined;
});

describe('agentSettingsResource', () => {
  it('dedupes concurrent loads (single-flight)', async () => {
    const settings = createSettings();
    let resolve: ((value: AgentSettings) => void) | undefined;

    const getSettings = vi.fn(
      () =>
        new Promise<AgentSettings>((r) => {
          resolve = r;
        })
    );

    // @ts-expect-error - partial test stub
    window.desktopAPI = { agent: { getSettings } };

    const p1 = agentSettingsResource.load();
    const p2 = agentSettingsResource.load();

    expect(getSettings).toHaveBeenCalledTimes(1);

    resolve?.(settings);

    await expect(p1).resolves.toEqual(settings);
    await expect(p2).resolves.toEqual(settings);
  });

  it('returns cached settings when preferCache is true', async () => {
    const settings = createSettings({ ui: { theme: 'dark' } });
    const getSettings = vi.fn().mockResolvedValue(settings);

    // @ts-expect-error - partial test stub
    window.desktopAPI = { agent: { getSettings } };

    await expect(agentSettingsResource.load()).resolves.toEqual(settings);
    expect(getSettings).toHaveBeenCalledTimes(1);

    await expect(agentSettingsResource.load()).resolves.toEqual(settings);
    expect(getSettings).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers on IPC settings change', async () => {
    const initial = createSettings();
    const next = createSettings({ ui: { theme: 'light' } });

    let handler: ((settings: AgentSettings) => void) | undefined;

    const getSettings = vi.fn().mockResolvedValue(initial);
    const onSettingsChange = vi.fn((cb: (settings: AgentSettings) => void) => {
      handler = cb;
      return () => {
        handler = undefined;
      };
    });

    // @ts-expect-error - partial test stub
    window.desktopAPI = { agent: { getSettings, onSettingsChange } };

    const listener = vi.fn();
    const dispose = agentSettingsResource.subscribe(listener);

    await agentSettingsResource.load();
    listener.mockClear();

    handler?.(next);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(agentSettingsResource.getCached()).toEqual(next);

    dispose();
    handler?.(createSettings({ ui: { theme: 'dark' } }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
