/**
 * [PROVIDES]: bindRuntimeEvents - runtime 顶层事件绑定
 * [DEPENDS]: membership/settings/mcp event sources, runtime refresh callbacks
 * [POS]: PC Agent Runtime 生命周期装配层
 */

import type { AgentSettings } from '../../../shared/ipc.js';

export type RuntimeEventBindingDeps = {
  onMembershipChange: (listener: () => void) => void;
  onSettingsChange: (listener: (next: AgentSettings, previous: AgentSettings) => void) => void;
};

export type RuntimeEventBindingInput = {
  refreshModelFactory: () => void;
  refreshMemoryTooling: () => Promise<void>;
  invalidateAgentFactory: () => void;
  scheduleMcpReload: (settings: AgentSettings['mcp']) => void;
};

export const bindRuntimeEvents = (
  deps: RuntimeEventBindingDeps,
  input: RuntimeEventBindingInput
) => {
  deps.onMembershipChange(() => {
    try {
      input.refreshModelFactory();
      input.invalidateAgentFactory();
      void input.refreshMemoryTooling().catch(() => {});
    } catch (error) {
      console.error('[agent-runtime] failed to reload model factory on membership change', error);
    }
  });

  deps.onSettingsChange((next, previous) => {
    const modelChanged =
      next.model.defaultModel !== previous.model.defaultModel ||
      JSON.stringify(next.providers) !== JSON.stringify(previous.providers) ||
      JSON.stringify(next.customProviders) !== JSON.stringify(previous.customProviders);
    const promptChanged =
      next.personalization.customInstructions !== previous.personalization.customInstructions;
    const mcpChanged =
      JSON.stringify(next.mcp.stdio) !== JSON.stringify(previous.mcp.stdio) ||
      JSON.stringify(next.mcp.streamableHttp) !== JSON.stringify(previous.mcp.streamableHttp);

    if (modelChanged) {
      try {
        input.refreshModelFactory();
        input.invalidateAgentFactory();
      } catch (error) {
        console.error('[agent-runtime] failed to reload model', error);
      }
    }
    if (promptChanged && !modelChanged) {
      input.invalidateAgentFactory();
    }
    if (mcpChanged) {
      input.scheduleMcpReload(next.mcp);
    }
  });
};
