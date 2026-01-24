/**
 * 模型选择器组件
 */
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Icon } from '@/components/ui/icon';
import { AiMagicIcon, ArrowDown01Icon, CheckmarkSquare01Icon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import type { ModelGroup } from '../types';

interface ModelSelectorProps {
  modelGroups: ModelGroup[];
  selectedModelId: string | null;
  onSelectModel: (id: string) => void;
  disabled?: boolean;
}

export function ModelSelector({
  modelGroups,
  selectedModelId,
  onSelectModel,
  disabled,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedModel = modelGroups.flatMap((g) => g.options).find((m) => m.id === selectedModelId);

  const hasModels = modelGroups.some((g) => g.options.length > 0);

  if (!hasModels) {
    return (
      <Button variant="ghost" size="sm" disabled className="h-8 gap-1.5 text-muted-foreground">
        <Icon icon={AiMagicIcon} className="size-3.5" />
        <span>无可用模型</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <span className="max-w-32 truncate">{selectedModel?.name ?? '选择模型'}</span>
          <Icon icon={ArrowDown01Icon} className="size-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start" side="top">
        <Command>
          <CommandList className="max-h-60">
            <CommandEmpty>没有找到模型</CommandEmpty>
            {modelGroups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => {
                      onSelectModel(option.id);
                      setOpen(false);
                    }}
                    className="gap-2 text-sm"
                  >
                    <span className="flex-1 truncate">{option.name}</span>
                    {selectedModelId === option.id && (
                      <Icon icon={CheckmarkSquare01Icon} className="size-4 shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
