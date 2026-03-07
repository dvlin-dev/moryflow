/**
 * [PROPS]: SidebarBottomPrimaryActionProps
 * [EMITS]: onClick()
 * [POS]: Sidebar 底部固定主操作（New chat）
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
