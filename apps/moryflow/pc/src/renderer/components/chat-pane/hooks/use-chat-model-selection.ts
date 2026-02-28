/**
 * [PROVIDES]: useChatModelSelection - 聊天模型选择与持久化
 * [DEPENDS]: desktopAPI.agent, model groups helpers
 * [POS]: Chat Pane 模型选择状态与同步
 * [UPDATE]: 2026-02-11 - 支持 selectedSkillName 注入到 Agent options，和输入框显式 skill 选择对齐
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentChatRequestOptions, AgentSettings } from '@shared/ipc';
import { buildProviderModelRef } from '@moryflow/model-bank/registry';
import type { ModelThinkingProfile } from '@moryflow/model-bank/registry';

import { computeAgentOptions } from '../handle';
import { buildModelGroupsFromSettings, type ModelGroup } from '../models';
import {
  findModelOption,
  hasEnabledModelOption,
  pickAvailableModelId,
  resolveThinkingLevel,
} from './use-chat-model-selection.utils';
import { agentSettingsResource } from '@/lib/agent-settings-resource';
import {
  getChatThinkingOverridesSnapshot,
  setChatThinkingOverrideLevel,
  subscribeChatThinkingOverrides,
} from '@/lib/chat-thinking-overrides';

const MODEL_STORAGE_KEY = 'moryflow.chat.preferredModel';

const readStoredModelId = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    return window.localStorage.getItem(MODEL_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};

const writeStoredModelId = (value: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (value) {
      window.localStorage.setItem(MODEL_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(MODEL_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
};

export const useChatModelSelection = (
  activeFilePath?: string | null,
  selectedSkillName?: string | null,
  resolveExternalThinkingProfile?: (modelId?: string) => ModelThinkingProfile | undefined
) => {
  const [selectedModelId, setSelectedModelIdState] = useState(() => readStoredModelId());
  const selectedModelIdRef = useRef(selectedModelId);
  const [selectedThinkingByModel, setSelectedThinkingByModel] = useState<Record<string, string>>(
    () => getChatThinkingOverridesSnapshot()
  );
  const [modelGroups, setModelGroups] = useState<ModelGroup[]>([]);
  const [selectedThinkingLevel, setSelectedThinkingLevelState] = useState('off');
  const selectedThinkingLevelRef = useRef('off');
  const agentOptionsRef = useRef<AgentChatRequestOptions | undefined>(
    computeAgentOptions({
      activeFilePath,
      preferredModelId: selectedModelId,
      thinkingLevel: 'off',
      thinkingProfile: resolveExternalThinkingProfile?.(selectedModelId),
      selectedSkillName: selectedSkillName ?? null,
    })
  );

  const updateSelection = useCallback((next: string, options?: { syncRemote?: boolean }) => {
    const normalized = next?.trim() ?? '';
    if (selectedModelIdRef.current === normalized) {
      return;
    }
    selectedModelIdRef.current = normalized;
    setSelectedModelIdState(normalized);
    writeStoredModelId(normalized);
    if (options?.syncRemote === false || !window.desktopAPI?.agent?.updateSettings) {
      return;
    }
    window.desktopAPI.agent
      .updateSettings({ model: { defaultModel: normalized } })
      .catch((error) => {
        console.error('[chat-pane] failed to persist preferred model', error);
      });
  }, []);

  useEffect(() => {
    agentOptionsRef.current = computeAgentOptions({
      activeFilePath,
      preferredModelId: selectedModelId,
      thinkingLevel: selectedThinkingLevel,
      thinkingProfile:
        findModelOption(modelGroups, selectedModelId)?.thinkingProfile ??
        resolveExternalThinkingProfile?.(selectedModelId),
      selectedSkillName: selectedSkillName ?? null,
    });
  }, [
    activeFilePath,
    modelGroups,
    selectedModelId,
    selectedThinkingLevel,
    selectedSkillName,
    resolveExternalThinkingProfile,
  ]);

  useEffect(() => {
    selectedModelIdRef.current = selectedModelId;
  }, [selectedModelId]);

  useEffect(() => {
    selectedThinkingLevelRef.current = selectedThinkingLevel;
  }, [selectedThinkingLevel]);

  useEffect(() => {
    return subscribeChatThinkingOverrides((next) => {
      setSelectedThinkingByModel(next);
    });
  }, []);

  useEffect(() => {
    const nextLevel = resolveThinkingLevel({
      modelId: selectedModelId,
      thinkingByModel: selectedThinkingByModel,
      modelGroups,
      resolveExternalThinkingProfile,
    });
    if (selectedThinkingLevelRef.current === nextLevel) {
      return;
    }
    setSelectedThinkingLevelState(nextLevel);
  }, [selectedModelId, selectedThinkingByModel, modelGroups, resolveExternalThinkingProfile]);

  const applySettings = useCallback(
    (settings: AgentSettings) => {
      const groups = buildModelGroupsFromSettings(settings);
      setModelGroups(groups);

      const hasSelected = hasEnabledModelOption(groups, selectedModelIdRef.current);
      if (hasSelected) {
        const nextLevel = resolveThinkingLevel({
          modelId: selectedModelIdRef.current,
          thinkingByModel: selectedThinkingByModel,
          modelGroups: groups,
          resolveExternalThinkingProfile,
        });
        setSelectedThinkingLevelState(nextLevel);
        return;
      }

      const candidate = pickAvailableModelId({
        groups,
        candidates: [
          settings.model?.defaultModel,
          ...settings.providers
            .filter((provider) => provider.enabled)
            .map((provider) =>
              provider.defaultModelId
                ? buildProviderModelRef(provider.providerId, provider.defaultModelId)
                : undefined
            ),
          ...settings.customProviders
            .filter((provider) => provider.enabled)
            .map((provider) =>
              provider.defaultModelId
                ? buildProviderModelRef(provider.providerId, provider.defaultModelId)
                : undefined
            ),
        ],
      });

      updateSelection(candidate || '', { syncRemote: false });
      const nextLevel = resolveThinkingLevel({
        modelId: candidate || '',
        thinkingByModel: selectedThinkingByModel,
        modelGroups: groups,
        resolveExternalThinkingProfile,
      });
      setSelectedThinkingLevelState(nextLevel);
    },
    [selectedThinkingByModel, updateSelection, resolveExternalThinkingProfile]
  );

  useEffect(() => {
    let mounted = true;

    const dispose = agentSettingsResource.subscribe((settings) => {
      if (!mounted) return;
      applySettings(settings);
    });

    agentSettingsResource.load().catch((error) => {
      console.error('[chat-pane] failed to load agent settings', error);
    });

    return () => {
      mounted = false;
      dispose();
    };
  }, [applySettings]);

  const setSelectedModelId = useCallback(
    (next: string) => {
      updateSelection(next);
    },
    [updateSelection]
  );

  const setSelectedThinkingLevel = useCallback(
    (nextLevel: string) => {
      const modelId = selectedModelIdRef.current;
      if (!modelId || !nextLevel?.trim()) {
        return;
      }
      const normalized = nextLevel.trim();
      const profile =
        findModelOption(modelGroups, modelId)?.thinkingProfile ??
        resolveExternalThinkingProfile?.(modelId);
      const isSupported = profile?.levels.some((level) => level.id === normalized);
      const safeLevel = profile && !isSupported ? profile.defaultLevel || 'off' : normalized;

      setSelectedThinkingLevelState(safeLevel);
      setChatThinkingOverrideLevel(modelId, safeLevel);
    },
    [modelGroups, resolveExternalThinkingProfile]
  );

  const selectedThinkingProfile: ModelThinkingProfile | undefined =
    findModelOption(modelGroups, selectedModelId)?.thinkingProfile ??
    resolveExternalThinkingProfile?.(selectedModelId);

  return {
    selectedModelId,
    setSelectedModelId,
    selectedThinkingLevel,
    selectedThinkingProfile,
    setSelectedThinkingLevel,
    modelGroups,
    agentOptionsRef,
  };
};
