/**
 * [PROPS]: { items, onAction } - 菜单项配置和动作回调
 * [EMITS]: onAction(action) - 菜单项点击时触发
 * [POS]: 文件/文件夹右键菜单内容组件
 */

import { Fragment } from 'react';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@anyhunt/ui/components/context-menu';
import { Icon } from '@anyhunt/ui/components/icon';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ContextMenuAction, ContextMenuItem as MenuItemType } from '../const';

type NodeContextMenuProps = {
  items: MenuItemType[];
  onAction: (action: ContextMenuAction) => void;
};

export const NodeContextMenu = ({ items, onAction }: NodeContextMenuProps) => {
  const { t } = useTranslation('workspace');

  return (
    <ContextMenuContent>
      {items.map((item, index) => (
        <Fragment key={item.action}>
          {item.dangerous && index > 0 && <ContextMenuSeparator />}
          <ContextMenuItem
            onClick={() => onAction(item.action)}
            className={cn(item.dangerous && 'text-destructive focus:text-destructive')}
          >
            {item.icon && <Icon icon={item.icon} className="mr-2 h-4 w-4" />}
            {t(item.labelKey as Parameters<typeof t>[0])}
          </ContextMenuItem>
        </Fragment>
      ))}
    </ContextMenuContent>
  );
};
