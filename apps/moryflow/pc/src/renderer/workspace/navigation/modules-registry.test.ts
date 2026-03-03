import { describe, expect, it } from 'vitest';
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
});
