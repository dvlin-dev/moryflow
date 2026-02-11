/**
 * [PROPS]: SkillPanelProps - Skills 选择面板数据与行为
 * [EMITS]: onSelectSkill/onRefresh
 * [POS]: Chat Prompt 输入框 Skills 面板（+ 菜单 / 空输入 slash 复用）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useMemo, useState } from 'react';
import type { SkillSummary } from '@shared/ipc';
import { Search, Wrench } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@anyhunt/ui/components/command';
import { Button } from '@anyhunt/ui/components/button';
import { cn } from '@/lib/utils';

export type SkillPanelProps = {
  disabled?: boolean;
  skills: SkillSummary[];
  onSelectSkill: (skill: SkillSummary) => void;
  onRefresh?: () => void;
  onClose?: () => void;
  className?: string;
  autoFocus?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
  headingLabel?: string;
};

export const SkillPanel = ({
  disabled,
  skills,
  onSelectSkill,
  onRefresh,
  onClose,
  className,
  autoFocus = false,
  searchPlaceholder = 'Search skills',
  emptyLabel = 'No skills found',
  headingLabel = 'Enabled Skills',
}: SkillPanelProps) => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return skills;
    return skills.filter((skill) =>
      `${skill.name} ${skill.title} ${skill.description}`.toLowerCase().includes(normalized)
    );
  }, [query, skills]);

  return (
    <div className={cn('w-72 p-0', className)}>
      <Command shouldFilter={false}>
        <CommandInput
          autoFocus={autoFocus}
          placeholder={searchPlaceholder}
          className="h-9"
          value={query}
          onValueChange={setQuery}
          disabled={disabled}
        />
        <CommandList>
          {filtered.length === 0 ? (
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                <Search className="size-8 opacity-50" />
                <span className="text-sm">{emptyLabel}</span>
              </div>
            </CommandEmpty>
          ) : (
            <CommandGroup heading={headingLabel}>
              {filtered.map((skill) => (
                <CommandItem
                  key={skill.name}
                  value={skill.name}
                  onSelect={() => {
                    onSelectSkill(skill);
                    onClose?.();
                  }}
                  disabled={disabled}
                  className="flex items-center gap-2"
                >
                  <Wrench className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{skill.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {skill.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
      {onRefresh ? (
        <div className="border-t border-border/50 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={onRefresh}
            disabled={disabled}
          >
            Refresh
          </Button>
        </div>
      ) : null}
    </div>
  );
};
