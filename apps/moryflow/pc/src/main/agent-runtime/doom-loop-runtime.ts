/**
 * [PROVIDES]: PC Doom Loop Runtime 组装（守卫与工具包装）
 * [DEPENDS]: agents-runtime/doom-loop
 * [POS]: PC Agent Runtime Doom Loop 入口，供审批与工具包装复用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { Tool } from '@openai/agents-core';
import {
  createDoomLoopGuard,
  DEFAULT_DOOM_LOOP_CONFIG,
  wrapToolsWithDoomLoop,
  type DoomLoopApprovalInfo,
  type DoomLoopCheckInput,
} from '@anyhunt/agents-runtime';
import type { AgentContext } from '@anyhunt/agents-runtime';

export type DoomLoopRuntime = {
  wrapTools: (tools: Tool<AgentContext>[]) => Tool<AgentContext>[];
  getPendingApproval: (callId: string) => DoomLoopApprovalInfo | undefined;
  approve: (callId: string, remember: 'once' | 'always') => void;
  clear: (callId: string) => void;
};

let doomLoopRuntime: DoomLoopRuntime | null = null;

export const createDoomLoopRuntime = (input: {
  uiAvailable: boolean;
  shouldSkip?: (input: DoomLoopCheckInput) => boolean;
}): DoomLoopRuntime => {
  const guard = createDoomLoopGuard({
    config: DEFAULT_DOOM_LOOP_CONFIG,
    uiAvailable: input.uiAvailable,
    shouldSkip: input.shouldSkip,
  });

  return {
    wrapTools: (tools) => wrapToolsWithDoomLoop(tools, guard),
    getPendingApproval: guard.getPendingApproval,
    approve: guard.approve,
    clear: guard.clear,
  };
};

export const initDoomLoopRuntime = (input: {
  uiAvailable: boolean;
  shouldSkip?: (input: DoomLoopCheckInput) => boolean;
}): DoomLoopRuntime => {
  doomLoopRuntime = createDoomLoopRuntime(input);
  return doomLoopRuntime;
};

export const getDoomLoopRuntime = (): DoomLoopRuntime | null => doomLoopRuntime;
