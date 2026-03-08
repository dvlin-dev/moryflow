/**
 * [PROVIDES]: useChatPaneFooterStore/useSyncChatPaneFooterStore - ChatFooter 的 store-first 状态入口
 * [DEPENDS]: zustand (vanilla) + React useEffect
 * [POS]: ChatPane -> ChatFooter 共享状态桥接层，避免巨型 props 透传
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useLayoutEffect } from 'react';
import type { ChatStatus } from 'ai';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { SettingsSection } from '@/components/settings-dialog/const';
import type { ChatGlobalPermissionMode, TokenUsage } from '@shared/ipc';
import type { ModelThinkingProfile } from '@moryflow/model-bank/registry';

import type { ChatSubmitPayload, ChatSubmitResult } from '../components/chat-prompt-input/const';
import type { ModelGroup } from '../models';

type ChatPaneFooterSnapshot = {
  status: ChatStatus;
  inputError: string | null;
  activeFilePath: string | null;
  activeFileContent: string | null;
  vaultPath: string | null;
  modelGroups: ModelGroup[];
  selectedModelId: string | null;
  selectedThinkingLevel: string | null;
  selectedThinkingProfile?: ModelThinkingProfile;
  disabled: boolean;
  tokenUsage: TokenUsage | null;
  contextWindow: number | undefined;
  mode: ChatGlobalPermissionMode;
  activeSessionId: string | null;
  selectedSkillName: string | null;
  onSubmit: (payload: ChatSubmitPayload) => Promise<ChatSubmitResult>;
  onStop: () => void;
  onInputError: (message: string) => void;
  onOpenSettings?: (section?: SettingsSection) => void;
  onSelectModel: (id: string) => void;
  onSelectThinkingLevel: (level: string) => void;
  onModeChange: (mode: ChatGlobalPermissionMode) => void;
  onSelectSkillName?: (name: string | null) => void;
};

type ChatPaneFooterStoreState = ChatPaneFooterSnapshot & {
  setSnapshot: (snapshot: ChatPaneFooterSnapshot) => void;
};

const noopSubmit = async (): Promise<ChatSubmitResult> => ({ submitted: false });
const noop = () => {};

const chatPaneFooterStore = createStore<ChatPaneFooterStoreState>((set) => ({
  status: 'ready',
  inputError: null,
  activeFilePath: null,
  activeFileContent: null,
  vaultPath: null,
  modelGroups: [],
  selectedModelId: null,
  selectedThinkingLevel: null,
  selectedThinkingProfile: undefined,
  disabled: true,
  tokenUsage: null,
  contextWindow: undefined,
  mode: 'ask',
  activeSessionId: null,
  selectedSkillName: null,
  onSubmit: noopSubmit,
  onStop: noop,
  onInputError: noop,
  onOpenSettings: undefined,
  onSelectModel: noop,
  onSelectThinkingLevel: noop,
  onModeChange: noop,
  onSelectSkillName: undefined,
  setSnapshot: (snapshot) => set(snapshot),
}));

const shouldSyncSnapshot = (current: ChatPaneFooterStoreState, next: ChatPaneFooterSnapshot) =>
  current.status !== next.status ||
  current.inputError !== next.inputError ||
  current.activeFilePath !== next.activeFilePath ||
  current.activeFileContent !== next.activeFileContent ||
  current.vaultPath !== next.vaultPath ||
  current.modelGroups !== next.modelGroups ||
  current.selectedModelId !== next.selectedModelId ||
  current.selectedThinkingLevel !== next.selectedThinkingLevel ||
  current.selectedThinkingProfile !== next.selectedThinkingProfile ||
  current.disabled !== next.disabled ||
  current.tokenUsage !== next.tokenUsage ||
  current.contextWindow !== next.contextWindow ||
  current.mode !== next.mode ||
  current.activeSessionId !== next.activeSessionId ||
  current.selectedSkillName !== next.selectedSkillName ||
  current.onSubmit !== next.onSubmit ||
  current.onStop !== next.onStop ||
  current.onInputError !== next.onInputError ||
  current.onOpenSettings !== next.onOpenSettings ||
  current.onSelectModel !== next.onSelectModel ||
  current.onSelectThinkingLevel !== next.onSelectThinkingLevel ||
  current.onModeChange !== next.onModeChange ||
  current.onSelectSkillName !== next.onSelectSkillName;

export const useChatPaneFooterStore = <T>(selector: (state: ChatPaneFooterStoreState) => T): T =>
  useStore(chatPaneFooterStore, selector);

export const useSyncChatPaneFooterStore = (snapshot: ChatPaneFooterSnapshot) => {
  useLayoutEffect(() => {
    const state = chatPaneFooterStore.getState();
    if (!shouldSyncSnapshot(state, snapshot)) {
      return;
    }
    state.setSnapshot(snapshot);
  }, [snapshot]);
};
