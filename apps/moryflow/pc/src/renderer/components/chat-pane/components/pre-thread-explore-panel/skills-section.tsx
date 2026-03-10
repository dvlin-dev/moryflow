/**
 * [PROPS]: title, skills (installed), onSelect
 * [POS]: Explore 面板 Skills 卡片区块
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { SkillSummary } from '@shared/ipc';
import { SKILL_DEFAULT_PROMPTS, buildFallbackSkillPrompt } from './const';

type SkillsSectionProps = {
  title: string;
  skills: SkillSummary[];
  onSelect: (prompt: string) => void;
};

export const SkillsSection = ({ title, skills, onSelect }: SkillsSectionProps) => {
  if (skills.length === 0) return null;

  return (
    <section>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        {title}
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {skills.map((skill) => {
          const prompt = SKILL_DEFAULT_PROMPTS[skill.name] ?? buildFallbackSkillPrompt(skill.name);
          return (
            <button
              key={skill.name}
              type="button"
              onClick={() => onSelect(prompt)}
              className="group flex flex-col gap-1 rounded-xl border border-border/60 bg-card/60 px-4 py-3.5 text-left transition-all duration-150 hover:border-border hover:bg-card hover:shadow-sm"
            >
              <span className="font-mono text-[11px] font-medium text-primary/70 group-hover:text-primary">
                ${skill.name}
              </span>
              <span className="text-[13px] font-medium leading-snug text-foreground">
                {skill.title}
              </span>
              <span className="line-clamp-2 text-[12px] leading-4 text-muted-foreground">
                {skill.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
