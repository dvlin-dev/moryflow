import type { DocumentSurface, HomeCanvasRequest } from '../const';
import type { SidebarMode, Destination } from '../navigation/state';
import { resolveWorkspaceLayout, type MainViewState } from '../navigation/layout-resolver';
import { getModulesRegistryItems } from '../navigation/modules-registry';

const MODULE_REGISTRY_ITEMS = getModulesRegistryItems();
const MAIN_KEEP_ALIVE_KEYS = [
  'agent-home',
  ...MODULE_REGISTRY_ITEMS.map((item) => item.mainViewState),
] as const;

export type MainKeepAliveViewKey = (typeof MAIN_KEEP_ALIVE_KEYS)[number];
export type MainViewKeepAliveMap = Record<MainKeepAliveViewKey, boolean>;
export type HomeMainSurface = 'default' | 'editor-split' | 'entry-canvas';
export type ChatComposerActiveFileContext = {
  activeFilePath: string | null;
  activeFileContent: string | null;
};

const MAIN_KEEP_ALIVE_KEY_SET = new Set<MainViewState>(MAIN_KEEP_ALIVE_KEYS);

const isMainKeepAliveViewKey = (
  mainViewState: MainViewState
): mainViewState is MainKeepAliveViewKey => MAIN_KEEP_ALIVE_KEY_SET.has(mainViewState);

const createEmptyMainViewKeepAliveMap = (): MainViewKeepAliveMap => ({
  'agent-home': false,
  'remote-agents': false,
  memory: false,
  skills: false,
  sites: false,
});

export const createInitialMainViewKeepAliveMap = (
  mainViewState: MainViewState
): MainViewKeepAliveMap => {
  const keepAliveMap = createEmptyMainViewKeepAliveMap();
  if (isMainKeepAliveViewKey(mainViewState)) {
    keepAliveMap[mainViewState] = true;
  }
  return keepAliveMap;
};

export const markMainViewMounted = (
  keepAliveMap: MainViewKeepAliveMap,
  mainViewState: MainViewState
): MainViewKeepAliveMap => {
  if (!isMainKeepAliveViewKey(mainViewState) || keepAliveMap[mainViewState]) {
    return keepAliveMap;
  }
  return {
    ...keepAliveMap,
    [mainViewState]: true,
  };
};

export const resolveMainViewState = (
  destination: Destination,
  sidebarMode: SidebarMode
): MainViewState => resolveWorkspaceLayout({ destination, sidebarMode }).mainViewState;

export const resolveHomeMainSurface = (
  destination: Destination,
  sidebarMode: SidebarMode,
  documentSurface: DocumentSurface,
  homeCanvasRequest: HomeCanvasRequest | null,
  activePath: string | null
): HomeMainSurface => {
  if (destination !== 'agent' || sidebarMode !== 'home') {
    return 'default';
  }
  if (documentSurface === 'empty') {
    return 'entry-canvas';
  }
  if (homeCanvasRequest && homeCanvasRequest.activePathAtRequest === activePath) {
    return 'entry-canvas';
  }
  return 'editor-split';
};

export const shouldRenderChatPanePortal = (homeMainSurface: HomeMainSurface): boolean =>
  homeMainSurface !== 'entry-canvas';

export const resolveChatComposerActiveFileContext = ({
  destination,
  sidebarMode,
  homeMainSurface,
  activeFilePath,
  activeFileContent,
}: {
  destination: Destination;
  sidebarMode: SidebarMode;
  homeMainSurface: HomeMainSurface;
  activeFilePath: string | null;
  activeFileContent: string | null;
}): ChatComposerActiveFileContext => {
  if (destination === 'agent' && sidebarMode === 'home' && homeMainSurface === 'editor-split') {
    return {
      activeFilePath,
      activeFileContent,
    };
  }

  return {
    activeFilePath: null,
    activeFileContent: null,
  };
};
