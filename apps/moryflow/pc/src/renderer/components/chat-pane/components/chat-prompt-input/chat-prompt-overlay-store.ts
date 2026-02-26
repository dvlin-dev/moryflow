/**
 * [PROVIDES]: useChatPromptOverlayStore/useSyncChatPromptOverlayStore - 输入浮层（@/slash）store
 * [DEPENDS]: zustand (vanilla) + React useEffect
 * [POS]: ChatPromptInput overlays 状态与行为桥接层，减少 props 平铺
 * [UPDATE]: 2026-02-26 - 新增 overlay store，overlays/file panel 改为就地 selector 取数
 * [UPDATE]: 2026-02-26 - 新增 shouldSync 快照比较（含 labels 字段级比较），减少重复同步
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useLayoutEffect } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { FlatFile } from '@/workspace/utils';
import type { SkillSummary } from '@shared/ipc';
import type { ContextFileTag } from '../context-file-tags';

type ChatPromptOverlayLabels = {
  searchDocs: string;
  recentFiles: string;
  allFiles: string;
  notFound: string;
  noOpenDocs: string;
  allDocsAdded: string;
  noRecentFiles: string;
  searchSkills: string;
  noSkillsFound: string;
  enabledSkills: string;
};

type ChatPromptOverlaySnapshot = {
  isDisabled: boolean;
  atPanelOpen: boolean;
  setAtPanelOpen: (open: boolean) => void;
  setAtTriggerIndex: (index: number | null) => void;
  slashSkillPanelOpen: boolean;
  setSlashSkillPanelOpen: (open: boolean) => void;
  workspaceFiles: FlatFile[];
  recentFiles: FlatFile[];
  contextFiles: ContextFileTag[];
  onAddContextFileFromAt: (file: ContextFileTag) => void;
  onRefreshFiles: () => void;
  skills: SkillSummary[];
  onSelectSkillFromSlash: (skillName: string) => void;
  onRefreshSkills: () => void;
  labels: ChatPromptOverlayLabels;
};

type ChatPromptOverlayStoreState = ChatPromptOverlaySnapshot & {
  setSnapshot: (snapshot: ChatPromptOverlaySnapshot) => void;
};

const noop = () => {};

const chatPromptOverlayStore = createStore<ChatPromptOverlayStoreState>((set) => ({
  isDisabled: false,
  atPanelOpen: false,
  setAtPanelOpen: noop,
  setAtTriggerIndex: noop,
  slashSkillPanelOpen: false,
  setSlashSkillPanelOpen: noop,
  workspaceFiles: [],
  recentFiles: [],
  contextFiles: [],
  onAddContextFileFromAt: noop,
  onRefreshFiles: noop,
  skills: [],
  onSelectSkillFromSlash: noop,
  onRefreshSkills: noop,
  labels: {
    searchDocs: '',
    recentFiles: '',
    allFiles: '',
    notFound: '',
    noOpenDocs: '',
    allDocsAdded: '',
    noRecentFiles: '',
    searchSkills: '',
    noSkillsFound: '',
    enabledSkills: '',
  },
  setSnapshot: (snapshot) => set(snapshot),
}));

const shouldSyncSnapshot = (
  current: ChatPromptOverlayStoreState,
  next: ChatPromptOverlaySnapshot
) =>
  current.isDisabled !== next.isDisabled ||
  current.atPanelOpen !== next.atPanelOpen ||
  current.setAtPanelOpen !== next.setAtPanelOpen ||
  current.setAtTriggerIndex !== next.setAtTriggerIndex ||
  current.slashSkillPanelOpen !== next.slashSkillPanelOpen ||
  current.setSlashSkillPanelOpen !== next.setSlashSkillPanelOpen ||
  current.workspaceFiles !== next.workspaceFiles ||
  current.recentFiles !== next.recentFiles ||
  current.contextFiles !== next.contextFiles ||
  current.onAddContextFileFromAt !== next.onAddContextFileFromAt ||
  current.onRefreshFiles !== next.onRefreshFiles ||
  current.skills !== next.skills ||
  current.onSelectSkillFromSlash !== next.onSelectSkillFromSlash ||
  current.onRefreshSkills !== next.onRefreshSkills ||
  current.labels.searchDocs !== next.labels.searchDocs ||
  current.labels.recentFiles !== next.labels.recentFiles ||
  current.labels.allFiles !== next.labels.allFiles ||
  current.labels.notFound !== next.labels.notFound ||
  current.labels.noOpenDocs !== next.labels.noOpenDocs ||
  current.labels.allDocsAdded !== next.labels.allDocsAdded ||
  current.labels.noRecentFiles !== next.labels.noRecentFiles ||
  current.labels.searchSkills !== next.labels.searchSkills ||
  current.labels.noSkillsFound !== next.labels.noSkillsFound ||
  current.labels.enabledSkills !== next.labels.enabledSkills;

export const useChatPromptOverlayStore = <T>(
  selector: (state: ChatPromptOverlayStoreState) => T
): T => useStore(chatPromptOverlayStore, selector);

export const useSyncChatPromptOverlayStore = (snapshot: ChatPromptOverlaySnapshot) => {
  useLayoutEffect(() => {
    const state = chatPromptOverlayStore.getState();
    if (!shouldSyncSnapshot(state, snapshot)) {
      return;
    }
    state.setSnapshot(snapshot);
  }, [snapshot]);
};
