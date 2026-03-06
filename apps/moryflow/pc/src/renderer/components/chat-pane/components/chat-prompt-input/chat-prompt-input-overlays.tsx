/**
 * [PROPS]: 无（通过 chat-prompt-overlay-store selector 取数）
 * [EMITS]: onOpenChange/onSelectFile/onSelectSkill
 * [POS]: ChatPromptInput 浮层片段（Popover）
 * [UPDATE]: 2026-02-26 - 从 ChatPromptInput 拆出 overlay 渲染
 * [UPDATE]: 2026-02-26 - 改为就地读取 overlay store，移除上层 props 平铺
 * [UPDATE]: 2026-02-26 - 移除对象字面量 selector，改为原子 selector，避免 zustand v5 快照引用抖动
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Popover, PopoverContent, PopoverTrigger } from '@moryflow/ui/components/popover';
import { useChatPromptOverlayStore } from './chat-prompt-overlay-store';
import { FileContextPanelFromOverlayStore } from './file-context-panel';
import { SkillPanel } from './skill-panel';

export const ChatPromptInputOverlays = () => {
  const isDisabled = useChatPromptOverlayStore((state) => state.isDisabled);
  const atPanelOpen = useChatPromptOverlayStore((state) => state.atPanelOpen);
  const setAtPanelOpen = useChatPromptOverlayStore((state) => state.setAtPanelOpen);
  const setAtTriggerIndex = useChatPromptOverlayStore((state) => state.setAtTriggerIndex);
  const slashSkillPanelOpen = useChatPromptOverlayStore((state) => state.slashSkillPanelOpen);
  const setSlashSkillPanelOpen = useChatPromptOverlayStore((state) => state.setSlashSkillPanelOpen);
  const skills = useChatPromptOverlayStore((state) => state.skills);
  const onSelectSkillFromSlash = useChatPromptOverlayStore((state) => state.onSelectSkillFromSlash);
  const onRefreshSkills = useChatPromptOverlayStore((state) => state.onRefreshSkills);
  const labels = useChatPromptOverlayStore((state) => state.labels);

  return (
    <>
      <Popover
        open={atPanelOpen}
        onOpenChange={(next) => {
          setAtPanelOpen(next);
          if (!next) {
            setAtTriggerIndex(null);
          }
        }}
      >
        <PopoverTrigger asChild>
          <span aria-hidden className="absolute left-3 top-0 h-0 w-0" />
        </PopoverTrigger>
        <PopoverContent align="start" side="top" sideOffset={8} className="w-72 p-0">
          <FileContextPanelFromOverlayStore autoFocus />
        </PopoverContent>
      </Popover>

      <Popover open={slashSkillPanelOpen} onOpenChange={setSlashSkillPanelOpen}>
        <PopoverTrigger asChild>
          <span aria-hidden className="absolute left-10 top-0 h-0 w-0" />
        </PopoverTrigger>
        <PopoverContent align="start" side="top" sideOffset={8} className="w-72 p-0">
          <SkillPanel
            autoFocus
            disabled={isDisabled}
            skills={skills}
            onSelectSkill={(skill) => {
              onSelectSkillFromSlash(skill.name);
            }}
            onRefresh={onRefreshSkills}
            searchPlaceholder={labels.searchSkills}
            emptyLabel={labels.noSkillsFound}
            headingLabel={labels.enabledSkills}
          />
        </PopoverContent>
      </Popover>
    </>
  );
};
