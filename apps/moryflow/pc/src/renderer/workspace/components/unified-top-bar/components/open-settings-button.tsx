/**
 * [PROPS]: OpenSettingsButtonProps
 * [EMITS]: onOpenSettings()
 * [POS]: UnifiedTopBar 右上角设置入口
 */

import { Settings } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@moryflow/ui/components/tooltip';
import { useTranslation } from '@/lib/i18n';

type OpenSettingsButtonProps = {
  onOpenSettings: () => void;
};

export const OpenSettingsButton = ({ onOpenSettings }: OpenSettingsButtonProps) => {
  const { t } = useTranslation('workspace');

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onOpenSettings}
            data-testid="topbar-settings-button"
            aria-label={t('settingsLabel')}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <Settings className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t('settingsLabel')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
