/**
 * [PROPS]: CreateMenuProps
 * [EMITS]: onCreateFile, onCreateFolder
 * [POS]: 新建文件/文件夹下拉菜单
 */

import { Add01Icon, File01Icon, Folder01Icon } from '@hugeicons/core-free-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@anyhunt/ui/components/dropdown-menu';
import { Icon } from '@anyhunt/ui/components/icon';
import { useTranslation } from '@/lib/i18n';
import type { CreateMenuProps } from '../const';

export const CreateMenu = ({ onCreateFile, onCreateFolder }: CreateMenuProps) => {
  const { t } = useTranslation('workspace');

  if (!onCreateFile && !onCreateFolder) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <Icon icon={Add01Icon} className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        {onCreateFile && (
          <DropdownMenuItem onClick={onCreateFile}>
            <Icon icon={File01Icon} className="mr-2 size-4" />
            {t('newNote')}
          </DropdownMenuItem>
        )}
        {onCreateFolder && (
          <DropdownMenuItem onClick={onCreateFolder}>
            <Icon icon={Folder01Icon} className="mr-2 size-4" />
            {t('newFolder')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
