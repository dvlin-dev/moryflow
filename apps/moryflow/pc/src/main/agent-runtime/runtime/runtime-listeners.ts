import {
  createModelFactory,
  type AgentContext,
  type ModelFactory,
  type PresetProvider,
} from '@moryflow/agents-runtime';
import { membershipBridge } from '../../membership-bridge.js';
import { mcpRuntime } from '../../mcp-runtime/index.js';
import { getAgentSettings, onAgentSettingsChange } from '../../agent-settings/index.js';
import type { DesktopMcpManager } from '../core/mcp-manager.js';

export const wireRuntimeListeners = (input: {
  mcpManager: DesktopMcpManager<AgentContext>;
  initialSettings: ReturnType<typeof getAgentSettings>;
  runtimeProviderRegistry: Record<string, PresetProvider>;
  toApiModelId: typeof import('@moryflow/model-bank/registry').toApiModelId;
  updateModelFactory: (factory: ModelFactory) => void;
  invalidateAgentFactory: () => void;
  refreshSkills: () => Promise<unknown>;
  logSkillsRefreshError: (error: unknown) => void;
}) => {
  const {
    mcpManager,
    initialSettings,
    runtimeProviderRegistry,
    toApiModelId,
    updateModelFactory,
    invalidateAgentFactory,
    refreshSkills,
    logSkillsRefreshError,
  } = input;

  void refreshSkills().catch(logSkillsRefreshError);

  mcpManager.setOnReload(() => invalidateAgentFactory());
  mcpManager.scheduleReload(initialSettings.mcp);
  void (async () => {
    try {
      await mcpManager.ensureReady();
      const { changedServerIds, failed } = await mcpRuntime.refreshEnabledServers(
        initialSettings.mcp.stdio
      );
      if (failed.length > 0) {
        console.warn('[agent-runtime] managed MCP update failed', failed);
      }
      if (changedServerIds.length > 0) {
        mcpManager.scheduleReload(getAgentSettings().mcp);
      }
    } catch (error) {
      console.warn('[agent-runtime] failed to run managed MCP updates', error);
    }
  })();

  membershipBridge.addListener(() => {
    try {
      const currentSettings = getAgentSettings();
      updateModelFactory(
        createModelFactory({
          settings: currentSettings,
          providerRegistry: runtimeProviderRegistry,
          toApiModelId,
          membership: membershipBridge.getConfig(),
        })
      );
      invalidateAgentFactory();
    } catch (error) {
      console.error('[agent-runtime] failed to reload model factory on membership change', error);
    }
  });

  onAgentSettingsChange((next, previous) => {
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
        updateModelFactory(
          createModelFactory({
            settings: next,
            providerRegistry: runtimeProviderRegistry,
            toApiModelId,
            membership: membershipBridge.getConfig(),
          })
        );
        invalidateAgentFactory();
      } catch (error) {
        console.error('[agent-runtime] failed to reload model', error);
      }
    }
    if (promptChanged && !modelChanged) {
      invalidateAgentFactory();
    }
    if (mcpChanged) {
      mcpManager.scheduleReload(next.mcp);
    }
  });
};
