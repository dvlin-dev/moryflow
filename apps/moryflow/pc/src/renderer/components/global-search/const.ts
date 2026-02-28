/**
 * [DEFINES]: GlobalSearchPanel 常量与 Props
 * [USED_BY]: global-search index/use-global-search
 * [POS]: Renderer 全局搜索组件边界
 */

import type { SearchFileHit, SearchThreadHit } from '@shared/ipc';

export const GLOBAL_SEARCH_DEBOUNCE_MS = 180;
export const GLOBAL_SEARCH_MIN_QUERY_LENGTH = 2;
export const GLOBAL_SEARCH_LIMIT_PER_GROUP = 10;

export type GlobalSearchPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFile: (hit: SearchFileHit) => void;
  onOpenThread: (hit: SearchThreadHit) => void;
};
