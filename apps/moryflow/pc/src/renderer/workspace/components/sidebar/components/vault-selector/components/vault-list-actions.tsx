/**
 * [PROPS]: VaultListActionsProps
 * [EMITS]: onStartCreate, onConfirmCreate, onOpenFolder
 * [POS]: Vault 列表操作区组件（新建/打开文件夹）
 */

import { Add01Icon, FolderAddIcon } from '@hugeicons/core-free-icons';
import { Button } from '@anyhunt/ui/components/button';
import { Icon } from '@anyhunt/ui/components/icon';
import { Input } from '@anyhunt/ui/components/input';
import { useTranslation } from '@/lib/i18n';
import type { VaultListActionsProps } from '../const';

export const VaultListActions = ({
  isCreating,
  newVaultName,
  onNewVaultNameChange,
  onStartCreate,
  onCancelCreate,
  onConfirmCreate,
  onOpenFolder,
}: VaultListActionsProps) => {
  const { t } = useTranslation('workspace');
  const { t: tCommon } = useTranslation('common');

  // 创建模式
  if (isCreating) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Input
          value={newVaultName}
          onChange={(e) => onNewVaultNameChange(e.target.value)}
          placeholder={t('workspaceName')}
          className="h-7 flex-1"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirmCreate();
            if (e.key === 'Escape') onCancelCreate();
          }}
        />
        <Button size="sm" className="h-7" onClick={onConfirmCreate}>
          {tCommon('create')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50"
        onClick={onStartCreate}
      >
        <Icon icon={FolderAddIcon} className="size-4 text-muted-foreground" />
        {t('newWorkspace')}
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50"
        onClick={onOpenFolder}
      >
        <Icon icon={Add01Icon} className="size-4 text-muted-foreground" />
        {t('openExistingFolder')}
      </button>
    </>
  );
};
