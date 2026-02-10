/**
 * [PROVIDES]: createAgentActions - Agent 面板语义操作（Open intents 会回到 Agent；Inline actions 就地生效）
 * [DEPENDS]: -
 * [POS]: Coordinator：把“回跳 + 执行动作”的规则集中托管，避免散落在 UI 里
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { VaultTreeNode } from '@shared/ipc';
import type { AgentSub } from './state';

type AgentActionsDeps = {
  setSub: (sub: AgentSub) => void;
  selectThread: (threadId: string) => void;
  openFile: (node: VaultTreeNode) => void;
};

export const createAgentActions = ({ setSub, selectThread, openFile }: AgentActionsDeps) => {
  return {
    setSub,
    openThread: (threadId: string) => {
      setSub('chat');
      selectThread(threadId);
    },
    openFile: (node: VaultTreeNode) => {
      setSub('workspace');
      openFile(node);
    },
  };
};
