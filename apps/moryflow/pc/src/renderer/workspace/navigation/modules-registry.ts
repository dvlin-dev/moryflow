/**
 * [PROVIDES]: MODULES_REGISTRY - Workspace 模块导航与主内容映射单一事实源
 * [DEPENDS]: navigation/state, navigation/layout-resolver
 * [POS]: 统一定义 module destination 的 label/order/mainView，避免导航与主区双轨维护
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { MainViewState } from './layout-resolver';
import type { ModuleDestination } from './state';

export type ModuleMainViewState = Extract<MainViewState, 'agent-module' | 'skills' | 'sites'>;

export type ModuleRegistryItem = {
  destination: ModuleDestination;
  label: string;
  order: number;
  mainViewState: ModuleMainViewState;
};

export const MODULES_REGISTRY: readonly ModuleRegistryItem[] = [
  {
    destination: 'agent-module',
    label: 'Agent',
    order: 10,
    mainViewState: 'agent-module',
  },
  {
    destination: 'skills',
    label: 'Skills',
    order: 20,
    mainViewState: 'skills',
  },
  {
    destination: 'sites',
    label: 'Sites',
    order: 30,
    mainViewState: 'sites',
  },
];

export const getModulesRegistryItems = (): readonly ModuleRegistryItem[] =>
  [...MODULES_REGISTRY].sort((a, b) => a.order - b.order);

export const getModuleMainViewState = (destination: ModuleDestination): ModuleMainViewState => {
  const matched = MODULES_REGISTRY.find((item) => item.destination === destination);
  if (matched) {
    return matched.mainViewState;
  }
  return 'sites';
};
