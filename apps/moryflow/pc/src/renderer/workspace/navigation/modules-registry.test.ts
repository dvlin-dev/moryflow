import { describe, expect, it } from 'vitest';
import type { ModuleDestination } from './state';
import { getModuleMainViewState, getModulesRegistryItems } from './modules-registry';

describe('navigation/modules-registry', () => {
  it('keeps modules order as Agent > Skills > Sites', () => {
    expect(getModulesRegistryItems().map((item) => item.destination)).toEqual([
      'agent-module',
      'skills',
      'sites',
    ]);
  });

  it('maps module destination to main view state', () => {
    expect(getModuleMainViewState('agent-module')).toBe('agent-module');
    expect(getModuleMainViewState('skills')).toBe('skills');
    expect(getModuleMainViewState('sites')).toBe('sites');
  });

  it('fails fast on unknown runtime destination instead of silent fallback', () => {
    expect(() =>
      getModuleMainViewState('unknown-module' as unknown as ModuleDestination)
    ).toThrowError('Unknown module destination');
  });
});
