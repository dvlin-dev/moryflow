import { describe, expect, it } from 'vitest';
import {
  createInitialMainViewKeepAliveMap,
  markMainViewMounted,
  resolveMainViewState,
} from './workspace-shell-main-content';
import { getModulesRegistryItems } from '../navigation/modules-registry';

describe('workspace-shell-main-content model', () => {
  it('resolves agent-module destination to dedicated main view', () => {
    expect(resolveMainViewState('agent-module', 'chat')).toBe('agent-module');
    expect(resolveMainViewState('agent-module', 'home')).toBe('agent-module');
  });

  it('keeps main-view routing in sync with modules registry', () => {
    const moduleMainViews = getModulesRegistryItems().map((item) =>
      resolveMainViewState(item.destination, 'chat')
    );

    expect(moduleMainViews).toEqual(getModulesRegistryItems().map((item) => item.mainViewState));
  });

  it('initial keep-alive map only mounts the current keep-alive view', () => {
    const keepAliveMap = createInitialMainViewKeepAliveMap('skills');

    expect(keepAliveMap).toMatchObject({
      'agent-home': false,
      'agent-module': false,
      skills: true,
      sites: false,
    });
  });

  it('markMainViewMounted returns a new map only when first mounting a keep-alive key', () => {
    const initialMap = createInitialMainViewKeepAliveMap('agent-home');
    const mountedSkillsMap = markMainViewMounted(initialMap, 'skills');

    expect(mountedSkillsMap).toEqual({
      ...initialMap,
      skills: true,
    });
    expect(mountedSkillsMap).not.toBe(initialMap);

    const unchangedByChatMain = markMainViewMounted(mountedSkillsMap, 'agent-chat');
    expect(unchangedByChatMain).toBe(mountedSkillsMap);

    const unchangedByAlreadyMounted = markMainViewMounted(mountedSkillsMap, 'skills');
    expect(unchangedByAlreadyMounted).toBe(mountedSkillsMap);
  });
});
