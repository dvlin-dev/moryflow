/**
 * [PROVIDES]: Chat Pane Portal 状态派生工具
 * [DEPENDS]: navigation/state
 * [POS]: 统一 ChatPane 在 main/panel/parking 三态下的放置与展示策略
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { SidebarMode, Destination } from '@/workspace/navigation/state';

export type ChatPanePlacement = 'main' | 'panel' | 'parking';

type ResolveChatPanePlacementInput = {
  destination: Destination;
  sidebarMode: SidebarMode;
};

export const resolveChatPanePlacement = ({
  destination,
  sidebarMode,
}: ResolveChatPanePlacementInput): ChatPanePlacement => {
  if (destination !== 'agent') {
    return 'parking';
  }

  if (sidebarMode === 'chat') {
    return 'main';
  }

  return 'panel';
};
