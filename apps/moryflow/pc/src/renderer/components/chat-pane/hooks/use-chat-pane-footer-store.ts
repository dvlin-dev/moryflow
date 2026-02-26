/**
 * [PROVIDES]: useChatPaneFooterStore/useSyncChatPaneFooterStore - ChatFooter 的 store-first 状态入口
 * [DEPENDS]: zustand (vanilla) + React useEffect
 * [POS]: ChatPane -> ChatFooter 共享状态桥接层，避免巨型 props 透传
 * [UPDATE]: 2026-02-26 - 新增 footer store，同步 ChatPane 控制器快照并由 ChatFooter 就地 selector 取数
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useLayoutEffect } from 'react';
import type { ChatStatus } from 'ai';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { SettingsSection } from '@/components/settings-dialog/const';
import type { TokenUsage, ChatSessionSummary } from '@shared/ipc';

import type { ChatSubmitPayload } from '../components/chat-prompt-input/const';
import type { ModelGroup } from '../models';

type ChatPaneFooterSnapshot = {
  status: ChatStatus;
  inputError: string | null;
  activeFilePath: string | null;
  activeFileContent: string | null;
  vaultPath: string | null;
  modelGroups: ModelGroup[];
  selectedModelId: string | null;
  disabled: boolean;
  tokenUsage: TokenUsage | null;
  contextWindow: number | undefined;
  mode: ChatSessionSummary['mode'];
  activeSessionId: string | null;
  selectedSkillName: string | null;
  onSubmit: (payload: ChatSubmitPayload) => Promise<void>;
  onStop: () => void;
  onInputError: (message: string) => void;
  onOpenSettings?: (section?: SettingsSection) => void;
  onSelectModel: (id: string) => void;
  onModeChange: (mode: ChatSessionSummary['mode']) => void;
  onSelectSkillName?: (name: string | null) => void;
};

type ChatPaneFooterStoreState = ChatPaneFooterSnapshot & {
  setSnapshot: (snapshot: ChatPaneFooterSnapshot) => void;
};

const noopSubmit = async () => {};
const noop = () => {};

const chatPaneFooterStore = createStore<ChatPaneFooterStoreState>((set) => ({
  status: 'ready',
  inputError: null,
  activeFilePath: null,
  activeFileContent: null,
  vaultPath: null,
  modelGroups: [],
  selectedModelId: null,
  disabled: true,
  tokenUsage: null,
  contextWindow: undefined,
  mode: 'agent',
  activeSessionId: null,
  selectedSkillName: null,
  onSubmit: noopSubmit,
  onStop: noop,
  onInputError: noop,
  onOpenSettings: undefined,
  onSelectModel: noop,
  onModeChange: noop,
  onSelectSkillName: undefined,
  setSnapshot: (snapshot) => set(snapshot),
}));

export const useChatPaneFooterStore = <T,>(selector: (state: ChatPaneFooterStoreState) => T): T =>
  useStore(chatPaneFooterStore, selector);

export const useSyncChatPaneFooterStore = (snapshot: ChatPaneFooterSnapshot) => {
  useLayoutEffect(() => {
    chatPaneFooterStore.getState().setSnapshot(snapshot);
  }, [snapshot]);
};
