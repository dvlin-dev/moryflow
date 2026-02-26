import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { FormLabel } from '@/components/ui/form';
import { Search } from 'lucide-react';
import { getModelCount, type ModelInfo } from '@moryflow/model-registry-data';

interface ModelSearchSectionProps {
  isEditing: boolean;
  searchOpen: boolean;
  searchQuery: string;
  suggestions: ModelInfo[];
  onSearchOpenChange: (open: boolean) => void;
  onSearchQueryChange: (query: string) => void;
  onSelectModel: (modelInfo: ModelInfo) => void;
}

export function ModelSearchSection({
  isEditing,
  searchOpen,
  searchQuery,
  suggestions,
  onSearchOpenChange,
  onSearchQueryChange,
  onSelectModel,
}: ModelSearchSectionProps) {
  if (isEditing) {
    return null;
  }

  return (
    <div className="space-y-2">
      <FormLabel>从模型库快速填充</FormLabel>
      <Popover open={searchOpen} onOpenChange={onSearchOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <Search className="mr-2 h-4 w-4" />
            搜索模型（{getModelCount()} 个可用）...
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="输入模型名称..."
              value={searchQuery}
              onValueChange={onSearchQueryChange}
            />
            <CommandList>
              <CommandEmpty>
                {searchQuery.length < 2 ? '请输入至少 2 个字符' : '未找到匹配的模型'}
              </CommandEmpty>
              {suggestions.map((modelInfo) => (
                <CommandItem
                  key={modelInfo.id}
                  value={modelInfo.id}
                  onSelect={() => onSelectModel(modelInfo)}
                >
                  <div className="flex justify-between w-full">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{modelInfo.displayName}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {modelInfo.id}
                      </div>
                    </div>
                    <div className="text-right text-xs ml-2 shrink-0">
                      <div>{modelInfo.providerName}</div>
                      <div className="text-muted-foreground">
                        ${modelInfo.inputPricePerMillion.toFixed(2)} / $
                        {modelInfo.outputPricePerMillion.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
