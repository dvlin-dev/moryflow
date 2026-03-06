/**
 * [PROVIDES]: useSelectedSkillStore - 输入框显式 skill 选择状态（跨页面共享）
 * [DEPENDS]: zustand
 * [POS]: Skills 页面 Try 与 Chat 输入框之间的状态桥接
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { create } from 'zustand';

type SelectedSkillState = {
  selectedSkillName: string | null;
  setSelectedSkillName: (name: string | null) => void;
  clearSelectedSkill: () => void;
};

export const useSelectedSkillStore = create<SelectedSkillState>((set) => ({
  selectedSkillName: null,
  setSelectedSkillName: (name) => set({ selectedSkillName: name?.trim() || null }),
  clearSelectedSkill: () => set({ selectedSkillName: null }),
}));
