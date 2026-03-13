import { describe, expect, it } from 'vitest';
import type { ModuleDestination } from './state';
import { getModuleMainViewState, getModulesRegistryItems } from './modules-registry';

describe('navigation/modules-registry', () => {
  it('keeps modules order as Remote Agents > Automations > Memory > Skills > Sites', () => {
    expect(getModulesRegistryItems().map((item) => item.destination)).toEqual([
      'remote-agents',
      'automations',
      'memory',
      'skills',
      'sites',
    ]);
  });

  it('maps module destination to main view state', () => {
    expect(getModuleMainViewState('remote-agents')).toBe('remote-agents');
    expect(getModuleMainViewState('automations')).toBe('automations');
    expect(getModuleMainViewState('memory')).toBe('memory');
    expect(getModuleMainViewState('skills')).toBe('skills');
    expect(getModuleMainViewState('sites')).toBe('sites');
  });

  it('fails fast on unknown runtime destination instead of silent fallback', () => {
    expect(() =>
      getModuleMainViewState('unknown-module' as unknown as ModuleDestination)
    ).toThrowError('Unknown module destination');
  });
});
