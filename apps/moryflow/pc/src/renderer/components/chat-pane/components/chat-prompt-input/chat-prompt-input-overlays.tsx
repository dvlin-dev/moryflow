/**
 * [PROPS]: 无（通过 chat-prompt-overlay-store selector 取数）
 * [EMITS]: onOpenChange/onSelectFile/onSelectSkill
 * [POS]: ChatPromptInput 浮层片段（Popover）
 * [UPDATE]: 2026-02-26 - 从 ChatPromptInput 拆出 overlay 渲染
 * [UPDATE]: 2026-02-26 - 改为就地读取 overlay store，移除上层 props 平铺
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Popover, PopoverContent, PopoverTrigger } from '@moryflow/ui/components/popover';
import { useChatPromptOverlayStore } from './chat-prompt-overlay-store';
import { FileContextPanelFromOverlayStore } from './file-context-panel';
import { SkillPanel } from './skill-panel';

export const ChatPromptInputOverlays = () => {
  const {
    isDisabled,
    atPanelOpen,
    setAtPanelOpen,
    setAtTriggerIndex,
    slashSkillPanelOpen,
    setSlashSkillPanelOpen,
    skills,
    onSelectSkillFromSlash,
    onRefreshSkills,
    labels,
  } = useChatPromptOverlayStore((state) => ({
    isDisabled: state.isDisabled,
    atPanelOpen: state.atPanelOpen,
    setAtPanelOpen: state.setAtPanelOpen,
    setAtTriggerIndex: state.setAtTriggerIndex,
    slashSkillPanelOpen: state.slashSkillPanelOpen,
    setSlashSkillPanelOpen: state.setSlashSkillPanelOpen,
    skills: state.skills,
    onSelectSkillFromSlash: state.onSelectSkillFromSlash,
    onRefreshSkills: state.onRefreshSkills,
    labels: state.labels,
  }));

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
