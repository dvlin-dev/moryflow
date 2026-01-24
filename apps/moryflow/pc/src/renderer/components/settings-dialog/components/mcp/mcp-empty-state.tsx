import { Button } from '@anyhunt/ui/components/button';
import { Badge } from '@anyhunt/ui/components/badge';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@anyhunt/ui/components/icon';
import { MCP_PRESETS, type McpPreset } from './mcp-presets';

type McpEmptyStateProps = {
  onAdd: () => void;
  onAddPreset: (preset: McpPreset) => void;
};

export const McpEmptyState = ({ onAdd, onAddPreset }: McpEmptyStateProps) => (
  <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
    <div className="space-y-2">
      <p className="text-lg font-medium">No MCP servers yet</p>
      <p className="text-sm text-muted-foreground">
        MCP lets AI call external tools like search and web scraping.
      </p>
    </div>

    <Button type="button" onClick={onAdd}>
      <Icon icon={Add01Icon} className="mr-2 size-4" />
      Add server
    </Button>

    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Or start from a preset:</p>
      <div className="flex flex-wrap justify-center gap-2">
        {MCP_PRESETS.map((preset) => (
          <Badge
            key={preset.id}
            variant="outline"
            className="cursor-pointer px-3 py-1.5 transition-colors hover:bg-muted"
            onClick={() => onAddPreset(preset)}
          >
            {preset.name}
            {preset.envRequired && preset.envRequired.length > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground">*</span>
            )}
          </Badge>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">* Requires environment variables</p>
    </div>
  </div>
);
