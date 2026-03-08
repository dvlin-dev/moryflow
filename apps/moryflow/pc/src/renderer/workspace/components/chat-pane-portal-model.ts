/**
 * [PROVIDES]: Chat Pane Portal 状态派生工具
 * [DEPENDS]: navigation/state
 * [POS]: 统一 ChatPane 在 main/panel/parking 三态下的放置与展示策略
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { SidebarMode, Destination } from '@/workspace/navigation/state';
import {
  resolveWorkspaceLayout,
  type ChatPanePlacement,
} from '@/workspace/navigation/layout-resolver';

type ResolveChatPanePlacementInput = {
  destination: Destination;
  sidebarMode: SidebarMode;
};

export const resolveChatPanePlacement = ({
  destination,
  sidebarMode,
}: ResolveChatPanePlacementInput): ChatPanePlacement =>
  resolveWorkspaceLayout({ destination, sidebarMode }).chatPanePlacement;
