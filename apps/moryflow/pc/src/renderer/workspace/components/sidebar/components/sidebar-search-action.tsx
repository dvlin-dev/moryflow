/**
 * [PROPS]: SidebarSearchActionProps
 * [EMITS]: onClick()
 * [POS]: Sidebar Header 右侧搜索 icon（全局搜索入口）
 */

import { Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@moryflow/ui/components/tooltip';
import { useTranslation } from '@/lib/i18n';

type SidebarSearchActionProps = {
  onClick: () => void;
};

export const SidebarSearchAction = ({ onClick }: SidebarSearchActionProps) => {
  const { t } = useTranslation('workspace');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={t('sidebarSearch')}
          onClick={onClick}
          className="window-no-drag rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <Search className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{t('sidebarSearch')}</TooltipContent>
    </Tooltip>
  );
};
