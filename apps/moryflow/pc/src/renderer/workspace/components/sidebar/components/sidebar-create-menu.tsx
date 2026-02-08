/**
 * [PROPS]: SidebarCreateMenuProps
 * [EMITS]: onCreatePage/onCreateFolder
 * [POS]: Sidebar 内容区创建入口（Workspace Mode：New page / New folder）
 */

import { Plus, FileText, FolderPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@anyhunt/ui/components/dropdown-menu';

type SidebarCreateMenuProps = {
  onCreatePage?: () => void;
  onCreateFolder?: () => void;
};

export const SidebarCreateMenu = ({ onCreatePage, onCreateFolder }: SidebarCreateMenuProps) => {
  if (!onCreatePage && !onCreateFolder) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          aria-label="Create"
        >
          <Plus className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-44">
        {onCreatePage && (
          <DropdownMenuItem onClick={onCreatePage}>
            <FileText className="mr-2 size-4" />
            New page
          </DropdownMenuItem>
        )}
        {onCreateFolder && (
          <DropdownMenuItem onClick={onCreateFolder}>
            <FolderPlus className="mr-2 size-4" />
            New folder
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
