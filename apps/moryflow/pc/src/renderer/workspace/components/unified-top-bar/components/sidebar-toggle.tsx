/**
 * [PROPS]: { collapsed, onToggle }
 * [EMITS]: onToggle - 切换侧边栏
 * [POS]: 侧边栏切换按钮
 */

import { ViewSidebarLeftIcon } from '@hugeicons/core-free-icons';
import { Button } from '@anyhunt/ui/components/button';
import { Icon } from '@anyhunt/ui/components/icon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@anyhunt/ui/components/tooltip';
import { useTranslation } from '@/lib/i18n';

type SidebarToggleProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export const SidebarToggle = ({ collapsed, onToggle }: SidebarToggleProps) => {
  const { t } = useTranslation('workspace');

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            onClick={onToggle}
          >
            <Icon icon={ViewSidebarLeftIcon} className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {collapsed ? t('expandSidebar') : t('collapseSidebar')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
