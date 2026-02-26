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
import type { ModelThinkingProfile } from '@shared/model-registry';

import { computeAgentOptions } from '../handle';
import {
  buildModelGroupsFromSettings,
  ensureModelIncluded,
  type ModelGroup,
  type ModelOption,
} from '../models';
import { agentSettingsResource } from '@/lib/agent-settings-resource';

const MODEL_STORAGE_KEY = 'moryflow.chat.preferredModel';
const THINKING_STORAGE_KEY = 'moryflow.chat.thinkingByModel';

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

const readStoredThinkingByModel = (): Record<string, string> => {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(THINKING_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        continue;
      }
      const modelId = key.trim();
      const level = value.trim();
      if (!modelId || !level) {
        continue;
      }
      result[modelId] = level;
    }
    return result;
  } catch {
    return {};
  }
};

const writeStoredThinkingByModel = (value: Record<string, string>) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      window.localStorage.removeItem(THINKING_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(THINKING_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

const findModelOption = (groups: ModelGroup[], modelId?: string | null): ModelOption | undefined => {
  if (!modelId) {
    return undefined;
  }
  for (const group of groups) {
    const matched = group.options.find((option) => option.id === modelId);
    if (matched) {
      return matched;
    }
  }
  return undefined;
};

const resolveThinkingLevel = (input: {
  modelId?: string;
  thinkingByModel: Record<string, string>;
  modelGroups: ModelGroup[];
  resolveExternalThinkingProfile?: (
    modelId?: string
  ) => ModelThinkingProfile | undefined;
}): string => {
  const profile =
    findModelOption(input.modelGroups, input.modelId)?.thinkingProfile ??
    input.resolveExternalThinkingProfile?.(input.modelId);
  if (!profile) {
    return 'off';
  }
  const offLevel = profile.levels.some((level) => level.id === 'off')
    ? 'off'
    : (profile.levels[0]?.id ?? 'off');
  if (!input.modelId) {
    return offLevel;
  }

  const hasStored = Object.prototype.hasOwnProperty.call(
    input.thinkingByModel,
    input.modelId
  );
  const stored = input.thinkingByModel[input.modelId];
  if (stored && profile.levels.some((level) => level.id === stored)) {
    return stored;
  }
  if (!hasStored) {
    return offLevel;
  }
  if (profile.levels.some((level) => level.id === profile.defaultLevel)) {
    return profile.defaultLevel;
  }
  return offLevel;
};

export const useChatModelSelection = (
  activeFilePath?: string | null,
  selectedSkillName?: string | null,
  resolveExternalThinkingProfile?: (
    modelId?: string
  ) => ModelThinkingProfile | undefined
) => {
  const [selectedModelId, setSelectedModelIdState] = useState(() => readStoredModelId());
  const selectedModelIdRef = useRef(selectedModelId);
  const [selectedThinkingByModel, setSelectedThinkingByModel] = useState<Record<string, string>>(
    () => readStoredThinkingByModel()
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
  }, [
    selectedModelId,
    selectedThinkingByModel,
    modelGroups,
    resolveExternalThinkingProfile,
  ]);

  const applySettings = useCallback(
    (settings: AgentSettings) => {
      const baseGroups = buildModelGroupsFromSettings(settings);
      const groupsWithSelection = ensureModelIncluded(
        baseGroups,
        selectedModelIdRef.current || settings.model?.defaultModel,
        'Custom'
      );
      setModelGroups(groupsWithSelection);
      const hasSelected =
        selectedModelIdRef.current &&
        groupsWithSelection.some((group) =>
          group.options.some((option) => option.id === selectedModelIdRef.current)
        );
      if (hasSelected) {
        const nextLevel = resolveThinkingLevel({
          modelId: selectedModelIdRef.current,
          thinkingByModel: selectedThinkingByModel,
          modelGroups: groupsWithSelection,
          resolveExternalThinkingProfile,
        });
        setSelectedThinkingLevelState(nextLevel);
        return;
      }
      const candidate =
        settings.model?.defaultModel?.trim() ||
        settings.providers
          ?.find((provider) => provider.enabled && provider.defaultModelId?.trim())
          ?.defaultModelId?.trim() ||
        groupsWithSelection
          .find((group) => group.options.some((option) => !option.disabled))
          ?.options.find((option) => !option.disabled)?.id ||
        '';
      updateSelection(candidate || '', { syncRemote: false });
      const nextLevel = resolveThinkingLevel({
        modelId: candidate || '',
        thinkingByModel: selectedThinkingByModel,
        modelGroups: groupsWithSelection,
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
      const safeLevel =
        profile && !isSupported ? profile.defaultLevel || 'off' : normalized;

      setSelectedThinkingLevelState(safeLevel);
      setSelectedThinkingByModel((prev) => {
        const next = {
          ...prev,
          [modelId]: safeLevel,
        };
        writeStoredThinkingByModel(next);
        return next;
      });
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
