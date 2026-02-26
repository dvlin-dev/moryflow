/**
 * 模型选择器组件
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sparkles, ChevronDown, SquareCheck } from 'lucide-react';
import { chatMethods } from '../methods';
import { useChatSessionStore } from '../store';

export function ModelSelector() {
  const [open, setOpen] = useState(false);
  const modelGroups = useChatSessionStore((state) => state.modelGroups);
  const selectedModelId = useChatSessionStore((state) => state.selectedModelId);
  const modelsLoading = useChatSessionStore((state) => state.modelsLoading);

  const selectedModel = modelGroups.flatMap((group) => group.options).find((m) => m.id === selectedModelId);
  const hasModels = modelGroups.some((group) => group.options.length > 0);

  if (!hasModels) {
    return (
      <Button variant="ghost" size="sm" disabled className="h-8 gap-1.5 text-muted-foreground">
        <Sparkles className="size-3.5" />
        <span>{modelsLoading ? '模型加载中...' : '无可用模型'}</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={modelsLoading}
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <span className="max-w-32 truncate">{selectedModel?.name ?? '选择模型'}</span>
          <ChevronDown className="size-3 opacity-50" />
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
                      chatMethods.selectChatModel(option.id);
                      setOpen(false);
                    }}
                    className="gap-2 text-sm"
                  >
                    <span className="flex-1 truncate">{option.name}</span>
                    {selectedModelId === option.id && <SquareCheck className="size-4 shrink-0" />}
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
