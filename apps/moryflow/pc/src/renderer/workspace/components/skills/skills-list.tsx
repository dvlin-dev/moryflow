/**
 * [PROPS]: SkillListProps - Skills 列表与推荐分区
 * [EMITS]: onOpenDetail/onInstallRecommended
 * [POS]: Skills 页面列表区
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { RecommendedSkill, SkillSummary } from '@shared/ipc';
import type { ReactNode } from 'react';
import { Button } from '@moryflow/ui/components/button';
import { cn } from '@/lib/utils';
import { Plus, Link as LinkIcon } from 'lucide-react';
import type { SkillListProps } from './const';

type SkillCardProps = {
  title: string;
  description: string;
  action?: ReactNode;
} & ({ onClick: () => void } | { onClick?: undefined });

const SkillCard = ({ title, description, onClick, action }: SkillCardProps) => {
  const cardClassName = cn(
    'group flex w-full items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3 text-left',
    'hover:bg-muted/30'
  );

  const content = (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{description}</p>
      </div>
      {action ?? <LinkIcon className="size-4 shrink-0 text-muted-foreground/80" />}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          cardClassName,
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50'
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={cardClassName}>{content}</div>;
};

const filterSkills = (skills: SkillSummary[], query: string): SkillSummary[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return skills;
  return skills.filter((skill) =>
    `${skill.name} ${skill.title} ${skill.description}`.toLowerCase().includes(normalized)
  );
};

const filterRecommended = (skills: RecommendedSkill[], query: string): RecommendedSkill[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return skills;
  return skills.filter((skill) =>
    `${skill.name} ${skill.title} ${skill.description}`.toLowerCase().includes(normalized)
  );
};

export const SkillsList = ({
  loading,
  skills,
  recommendedSkills,
  search,
  onOpenDetail,
  onInstallRecommended,
}: SkillListProps) => {
  const filteredInstalled = filterSkills(skills, search);
  const filteredRecommended = filterRecommended(recommendedSkills, search);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading skills...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Installed</h2>
        {filteredInstalled.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
            No installed skills.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredInstalled.map((skill) => (
              <SkillCard
                key={skill.name}
                title={skill.title}
                description={`${skill.enabled ? 'Enabled' : 'Disabled'} · ${skill.description}`}
                onClick={() => onOpenDetail(skill)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Recommended</h2>
        {filteredRecommended.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
            No recommendations right now.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredRecommended.map((skill) => (
              <SkillCard
                key={skill.name}
                title={skill.title}
                description={skill.description}
                action={
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={(event) => {
                      event.stopPropagation();
                      onInstallRecommended(skill);
                    }}
                  >
                    <Plus className="size-4" />
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
