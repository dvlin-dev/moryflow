/**
 * [PROVIDES]: createAgentActions - Agent 面板语义操作（Open intents 会回到 Agent；Inline actions 就地生效）
 * [DEPENDS]: -
 * [POS]: Coordinator：把“回跳 + 执行动作”的规则集中托管，避免散落在 UI 里
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { VaultTreeNode } from '@shared/ipc';
import type { SidebarMode } from './state';

type AgentActionsDeps = {
  goToAgent?: () => void;
  setSidebarMode: (mode: SidebarMode) => void;
  selectThread: (threadId: string) => void;
  openFile: (node: VaultTreeNode) => void;
  clearHomeCanvas?: () => void;
};

export const createAgentActions = ({
  goToAgent,
  setSidebarMode,
  selectThread,
  openFile,
  clearHomeCanvas,
}: AgentActionsDeps) => {
  return {
    setSidebarMode,
    openThread: (threadId: string) => {
      goToAgent?.();
      clearHomeCanvas?.();
      setSidebarMode('chat');
      selectThread(threadId);
    },
    openFile: (node: VaultTreeNode) => {
      goToAgent?.();
      clearHomeCanvas?.();
      setSidebarMode('home');
      openFile(node);
    },
  };
};
