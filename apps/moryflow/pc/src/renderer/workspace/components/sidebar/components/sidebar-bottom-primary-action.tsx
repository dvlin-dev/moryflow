/**
 * [PROPS]: SidebarBottomPrimaryActionProps
 * [EMITS]: onClick()
 * [POS]: Sidebar 底部固定主操作（New chat）
 * [UPDATE]: 2026-02-28 - 样式收敛为圆角胶囊按钮，图标+文字居中，图标改为 BadgePlus
 */

import { BadgePlus } from 'lucide-react';
import { Button } from '@moryflow/ui/components/button';

type SidebarBottomPrimaryActionProps = {
  onClick: () => void;
};

export const SidebarBottomPrimaryAction = ({ onClick }: SidebarBottomPrimaryActionProps) => {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 w-full justify-center gap-2 rounded-full"
      onClick={onClick}
    >
      <BadgePlus className="size-4" />
      New chat
    </Button>
  );
};
