/**
 * [PROVIDES]: MODULES_REGISTRY - Workspace 模块导航与主内容映射单一事实源
 * [DEPENDS]: navigation/state, navigation/layout-resolver
 * [POS]: 统一定义 module destination 的 label/order/mainView，避免导航与主区双轨维护
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { MainViewState } from './layout-resolver';
import type { ModuleDestination } from './state';

export type ModuleMainViewState = Extract<
  MainViewState,
  'remote-agents' | 'memory' | 'skills' | 'sites'
>;

export type ModuleRegistryItem = {
  destination: ModuleDestination;
  label: string;
  order: number;
  mainViewState: ModuleMainViewState;
};

export const MODULES_REGISTRY: readonly ModuleRegistryItem[] = [
  {
    destination: 'remote-agents',
    label: 'Remote Agents',
    order: 10,
    mainViewState: 'remote-agents',
  },
  {
    destination: 'memory',
    label: 'Memory',
    order: 20,
    mainViewState: 'memory',
  },
  {
    destination: 'skills',
    label: 'Skills',
    order: 30,
    mainViewState: 'skills',
  },
  {
    destination: 'sites',
    label: 'Sites',
    order: 40,
    mainViewState: 'sites',
  },
];

export const getModulesRegistryItems = (): readonly ModuleRegistryItem[] =>
  [...MODULES_REGISTRY].sort((a, b) => a.order - b.order);

const MODULE_MAIN_VIEW_STATE_BY_DESTINATION: Record<ModuleDestination, ModuleMainViewState> = {
  'remote-agents': 'remote-agents',
  memory: 'memory',
  skills: 'skills',
  sites: 'sites',
};

export const getModuleMainViewState = (destination: ModuleDestination): ModuleMainViewState => {
  if (!Object.hasOwn(MODULE_MAIN_VIEW_STATE_BY_DESTINATION, destination)) {
    throw new Error(`Unknown module destination: ${String(destination)}`);
  }
  return MODULE_MAIN_VIEW_STATE_BY_DESTINATION[destination];
};
