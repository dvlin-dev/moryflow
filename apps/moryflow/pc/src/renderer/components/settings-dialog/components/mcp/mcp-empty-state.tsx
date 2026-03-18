import { useTranslation } from '@/lib/i18n';
import { Button } from '@moryflow/ui/components/button';
import { Badge } from '@moryflow/ui/components/badge';
import { Plus } from 'lucide-react';
import { MCP_PRESETS, type McpPreset } from './mcp-presets';

type McpEmptyStateProps = {
  onAdd: () => void;
  onAddPreset: (preset: McpPreset) => void;
};

export const McpEmptyState = ({ onAdd, onAddPreset }: McpEmptyStateProps) => {
  const { t } = useTranslation('settings');

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <p className="text-lg font-medium">{t('mcpNoServersTitle')}</p>
        <p className="text-sm text-muted-foreground">{t('mcpNoServersDescription')}</p>
      </div>

      <Button type="button" onClick={onAdd}>
        <Plus className="mr-2 size-4" />
        {t('mcpAddServer')}
      </Button>

      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">{t('mcpOrPreset')}</p>
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
        <p className="text-[10px] text-muted-foreground">{t('mcpRequiresEnvVars')}</p>
      </div>
    </div>
  );
};
